"""
POST /api/v1/analyze/{session_id}
Triggers the full agent pipeline in the background.
"""
import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from services import session_store
from agents.orchestrator import DataAnalystOrchestrator

router = APIRouter()
_orchestrator = DataAnalystOrchestrator()


@router.post("/analyze/{session_id}")
async def trigger_analysis(session_id: str, background_tasks: BackgroundTasks):
    if not session_store.get_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    background_tasks.add_task(_orchestrator.analyze, session_id)
    return {
        "status": "processing",
        "session_id": session_id,
        "websocket_url": f"/ws/{session_id}",
    }


@router.get("/status/{session_id}")
def get_status(session_id: str):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"agent_statuses": session["agent_statuses"]}
