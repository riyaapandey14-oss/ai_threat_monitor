"""
FastAPI backend entrypoint.

This file (and everything under backend/) is new infrastructure added on
top of the existing, UNMODIFIED detection pipeline:
    pipeline.py, dashboard.py, detection_engine.py, explainability.py,
    risk_scoring.py, response.py, ingestion.py, features.py,
    data/synthetic_data.py, models/autoencoder.py, models/classifier.py
None of those files were changed to build this API.

Endpoints:
  GET  /api/health
  GET  /api/alerts                       (filters: severity, attack_type, limit)
  GET  /api/alerts/{alert_id}
  GET  /api/explainability/{alert_id}
  GET  /api/threat-summary
  GET  /api/entities
  GET  /api/entities/{entity_id}
  GET  /api/metrics
  POST /api/run-detection                {"n_events": 300}
  POST /api/response/{alert_id}/confirm
  WS   /ws/alerts                        live event-by-event stream

Run (from the ai_threat_monitor/ project root):
    uvicorn backend.main:app --reload --port 8000
"""

import asyncio
import os
import sys

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from backend.api.routes import router as api_router          # noqa: E402
from backend.services.detection_service import service        # noqa: E402

app = FastAPI(title="AI Threat Monitoring API")

# Safe, explicit CORS: only the local Vite dev server origins are allowed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.on_event("startup")
def startup():
    service.train()
    # Seed one detection batch so the dashboard has real data to show
    # immediately on first load, before the user clicks "Run Detection".
    service.run_detection_batch(n_events=200)
    print("[backend] Detection engine trained; seed batch complete.")


@app.websocket("/ws/alerts")
async def ws_alerts(ws: WebSocket):
    """Streams one newly scored event at a time for the React Live Monitoring page."""
    await ws.accept()
    try:
        while True:
            ingestor = service.make_ingestor()
            while ingestor.has_more():
                for event, _, true_type in ingestor.poll():
                    record = service.score_one_live(event, true_type)
                    await ws.send_json(record)
                    await asyncio.sleep(0.15)
    except WebSocketDisconnect:
        pass


@app.websocket("/ws/stream")
async def ws_stream(ws: WebSocket):
    """
    Preserved for backward compatibility with the standalone CDN dashboard
    at frontend/legacy_dashboard.html from the previous MVP iteration.
    Functionally identical to /ws/alerts.
    """
    await ws_alerts(ws)


# ---- Legacy standalone dashboard (previous MVP iteration), still servable ----
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")


@app.get("/legacy")
def legacy_dashboard():
    return FileResponse(os.path.join(FRONTEND_DIR, "legacy_dashboard.html"))
