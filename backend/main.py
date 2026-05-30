import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

from routers import upload, analyze, insights, websocket

app = FastAPI(title="AI Data Analyst Copilot", version="2.0.0")

# ── CORS — allow everything in dev ────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,        # must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(upload.router,   prefix="/api/v1")
app.include_router(analyze.router,  prefix="/api/v1")
app.include_router(insights.router, prefix="/api/v1")
app.include_router(websocket.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


@app.get("/api/v1/debug")
def debug():
    key = os.getenv("GROQ_API_KEY", "")
    try:
        import groq
        groq_installed = True
    except ImportError:
        groq_installed = False
    return {
        "groq_key_set": bool(key and key != "your_groq_api_key_here"),
        "groq_key_preview": (key[:8] + "...") if len(key) > 8 else "NOT SET",
        "groq_package_installed": groq_installed,
        "env_file_loaded": bool(key),
    }
