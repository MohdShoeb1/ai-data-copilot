"""
WebSocket manager — broadcasts agent status updates to connected clients.
"""
import json
import asyncio
from typing import Dict
from fastapi import WebSocket, WebSocketDisconnect, APIRouter

router = APIRouter()

# session_id → WebSocket
_connections: Dict[str, WebSocket] = {}


async def connect(session_id: str, ws: WebSocket):
    await ws.accept()
    _connections[session_id] = ws


def disconnect(session_id: str):
    _connections.pop(session_id, None)


async def broadcast(session_id: str, payload: dict):
    """Send a JSON message to the client for this session."""
    ws = _connections.get(session_id)
    if ws:
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            disconnect(session_id)


async def agent_update(
    session_id: str,
    agent: str,
    status: str,
    message: str,
    progress: int = 0,
):
    await broadcast(session_id, {
        "type": "agent_update",
        "agent": agent,
        "status": status,
        "message": message,
        "progress": progress,
    })


async def analysis_complete(session_id: str):
    await broadcast(session_id, {
        "type": "analysis_complete",
        "session_id": session_id,
    })


# ── WebSocket endpoint ────────────────────────────────────────────────────────
@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await connect(session_id, websocket)
    try:
        while True:
            # Keep-alive: client can send pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        disconnect(session_id)
