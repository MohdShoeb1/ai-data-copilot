"""
GET  /api/v1/insights/{session_id}
GET  /api/v1/charts/{session_id}
POST /api/v1/chat/{session_id}
GET  /api/v1/report/{session_id}/json
GET  /api/v1/download/csv/{session_id}
"""
import io
import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from services import session_store
from agents.chat_validation_agents import ChatAgent

router = APIRouter()


def _get_df(session: dict):
    """Safe DataFrame getter — avoids pandas ambiguous truth value error."""
    df = session.get("df_clean")
    if df is None or (hasattr(df, 'empty') and df.empty):
        df = session.get("df_raw")
    return df


# ── Insights ──────────────────────────────────────────────────────────────────
@router.get("/insights/{session_id}")
def get_insights(session_id: str):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    insights = session.get("insights")
    if not insights:
        raise HTTPException(202, "Insights not ready yet")
    cleaning = session.get("cleaning_report")
    return {
        "stats": insights.stats,
        "narrative": insights.narrative,
        "correlations": insights.correlations,
        "anomalies": insights.anomalies,
        "trends": insights.trends,
        "column_info": insights.column_info,
        "data_quality_score": cleaning.quality_score if cleaning else None,
        "cleaning_steps": [
            {"action": s.action, "detail": s.detail, "rows_affected": s.rows_affected}
            for s in (cleaning.steps if cleaning else [])
        ],
        "original_shape": list(cleaning.original_shape) if cleaning else None,
        "cleaned_shape": list(cleaning.cleaned_shape) if cleaning else None,
    }


# ── Charts ────────────────────────────────────────────────────────────────────
@router.get("/charts/{session_id}")
def get_charts(session_id: str):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    charts = session.get("charts")
    if not charts:
        raise HTTPException(202, "Charts not ready yet")
    return {
        "charts": [
            {
                "id": c.id,
                "type": c.type,
                "title": c.title,
                "description": c.description,
                "data": c.data,
                "x_key": c.x_key,
                "y_key": c.y_key,
                "color": c.color,
            }
            for c in charts.charts
        ]
    }


# ── Chat ──────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = []


_chat_agent = ChatAgent()


@router.post("/chat/{session_id}")
def chat(session_id: str, req: ChatRequest):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    df = _get_df(session)
    if df is None:
        raise HTTPException(202, "Data not ready yet")

    insights = session.get("insights")
    column_info = insights.column_info if insights else None
    stats = insights.stats if insights else None

    history = session.get("chat_history", [])
    history.append({"role": "user", "content": req.message})

    result = _chat_agent.run(
        question=req.message,
        df=df,
        history=req.history or history[:-1],
        column_info=column_info,
        stats=stats,
    )

    history.append({"role": "assistant", "content": result.answer})
    session_store.update_session(session_id, "chat_history", history)

    return {
        "answer": result.answer,
        "evidence": result.evidence,
        "suggested_chart": result.suggested_chart,
        "confidence": result.confidence,
    }


# ── Report ────────────────────────────────────────────────────────────────────
@router.get("/report/{session_id}/json")
def get_report_json(session_id: str):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    report = session.get("report")
    if not report:
        raise HTTPException(202, "Report not ready yet")
    return {
        "filename": session.get("filename"),
        "executive_summary": report.executive_summary,
        "findings": report.findings,
        "recommendations": report.recommendations,
        "data_quality": report.data_quality,
        "sections": [{"title": s.title, "content": s.content} for s in report.sections],
    }


# ── Download cleaned CSV ──────────────────────────────────────────────────────
@router.get("/download/csv/{session_id}")
def download_csv(session_id: str):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    df = _get_df(session)
    if df is None:
        raise HTTPException(404, "Data not found")
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    fname = session.get("filename", "data").replace(".csv", "_cleaned.csv")
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={fname}"},
    )
