"""
Orchestrator Agent — master coordinator.
Runs agents in sequence, streams progress via WebSocket.
"""
import asyncio
import pandas as pd

from agents.cleaning_agent import DataCleaningAgent
from agents.insight_agent import InsightAgent
from agents.visualization_agent import VisualizationAgent
from agents.report_agent import ReportAgent
from agents.chat_validation_agents import ChatAgent, ValidationAgent
from services import session_store
from routers import websocket as ws


class DataAnalystOrchestrator:

    def __init__(self):
        self.cleaner = DataCleaningAgent()
        self.insight = InsightAgent()
        self.viz = VisualizationAgent()
        self.report = ReportAgent()
        self.chat = ChatAgent()
        self.validator = ValidationAgent()

    async def analyze(self, session_id: str):
        session = session_store.get_session(session_id)
        if not session:
            return

        df_raw: pd.DataFrame = session["df_raw"]
        filename: str = session["filename"]

        # ── Agent 1: Cleaning ─────────────────────────────────────────────
        await self._set_running(session_id, "cleaner", "Scanning for issues…")
        cleaning_result = await asyncio.to_thread(self.cleaner.run, df_raw)
        await self._set_running(session_id, "cleaner", f"Removed {sum(s.rows_affected for s in cleaning_result.steps)} rows, quality: {cleaning_result.quality_score}%", 80)
        session_store.update_session(session_id, "cleaning_report", cleaning_result)
        session_store.update_session(session_id, "df_clean", cleaning_result.cleaned_df)
        await self._set_complete(session_id, "cleaner", f"Done — quality score {cleaning_result.quality_score}/100")

        # ── Agent 2: Insights ─────────────────────────────────────────────
        await self._set_running(session_id, "insight", "Computing statistics…")
        insight_result = await asyncio.to_thread(self.insight.run, cleaning_result.cleaned_df, filename)
        await self._set_running(session_id, "insight", f"Found {len(insight_result.anomalies)} anomalies, {len(insight_result.correlations)} correlations", 70)
        session_store.update_session(session_id, "insights", insight_result)
        await self._set_complete(session_id, "insight", f"{len(insight_result.narrative)} insights generated")

        # ── Agents 3 & 4 run in parallel ─────────────────────────────────
        await asyncio.gather(
            self._run_viz(session_id, cleaning_result.cleaned_df, insight_result),
            self._run_report(session_id, insight_result, filename, cleaning_result),
        )

        # ── Agent 5: Chat (prep context) ──────────────────────────────────
        await self._set_running(session_id, "chat", "Indexing dataset for Q&A…")
        await asyncio.sleep(0.3)
        await self._set_complete(session_id, "chat", "Ready — ask anything")

        # ── Agent 6: Validation ───────────────────────────────────────────
        await self._set_running(session_id, "validator", "Cross-checking insight claims…")
        validation = await asyncio.to_thread(self.validator.run, insight_result, cleaning_result.cleaned_df)
        session_store.update_session(session_id, "validation", validation)
        await self._set_complete(session_id, "validator", validation.summary[:60])

        # ── Done ──────────────────────────────────────────────────────────
        await ws.analysis_complete(session_id)

    async def _run_viz(self, session_id, df, insights):
        await self._set_running(session_id, "viz", "Choosing chart types…")
        viz_result = await asyncio.to_thread(self.viz.run, df, insights)
        session_store.update_session(session_id, "charts", viz_result)
        await self._set_complete(session_id, "viz", f"{len(viz_result.charts)} charts generated")

    async def _run_report(self, session_id, insights, filename, cleaning_report):
        await self._set_running(session_id, "report", "Drafting executive summary…")
        session = session_store.get_session(session_id)
        charts = session.get("charts") if session else None
        report_result = await asyncio.to_thread(
            self.report.run, insights, charts, filename, cleaning_report
        )
        session_store.update_session(session_id, "report", report_result)
        await self._set_complete(session_id, "report", "Executive report ready")

    async def _set_running(self, session_id, agent, message, progress=30):
        session_store.set_agent_status(session_id, agent, "running")
        await ws.agent_update(session_id, agent, "running", message, progress)

    async def _set_complete(self, session_id, agent, message):
        session_store.set_agent_status(session_id, agent, "complete")
        await ws.agent_update(session_id, agent, "complete", message, 100)
