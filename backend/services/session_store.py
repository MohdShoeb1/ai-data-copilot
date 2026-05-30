"""
In-memory session store — holds all agent results keyed by session_id.
For production: swap this for Redis or PostgreSQL.
"""
from typing import Dict, Any
import pandas as pd

# Central store: { session_id: SessionData }
_store: Dict[str, Dict[str, Any]] = {}


def create_session(session_id: str, filename: str, df_raw: pd.DataFrame):
    _store[session_id] = {
        "filename": filename,
        "df_raw": df_raw,
        "df_clean": None,
        "cleaning_report": None,
        "insights": None,
        "charts": None,
        "report": None,
        "chat_history": [],
        "agent_statuses": {
            "cleaner": "pending",
            "insight": "pending",
            "viz": "pending",
            "report": "pending",
            "chat": "pending",
            "validator": "pending",
        },
    }


def get_session(session_id: str) -> Dict[str, Any] | None:
    return _store.get(session_id)


def update_session(session_id: str, key: str, value: Any):
    if session_id in _store:
        _store[session_id][key] = value


def set_agent_status(session_id: str, agent: str, status: str):
    if session_id in _store:
        _store[session_id]["agent_statuses"][agent] = status


def get_all_sessions():
    return list(_store.keys())
