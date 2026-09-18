"""
REST API routes. Every handler calls into backend/services/detection_service.py
-- no detection, scoring, or explainability logic is duplicated here.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from services.detection_service import service

router = APIRouter(prefix="/api")


class RunDetectionRequest(BaseModel):
    n_events: int = Field(default=300, ge=1, le=5000)


@router.get("/health")
def health():
    return {"status": "ok", "ready": service.ready}


@router.get("/alerts")
def list_alerts(
    severity: str | None = Query(default=None, pattern="^(low|medium|high)$"),
    attack_type: str | None = Query(default=None, max_length=64),
    limit: int = Query(default=200, ge=1, le=2000),
):
    alerts = service.get_alerts()
    if severity:
        alerts = [a for a in alerts if a["tier"] == severity]
    if attack_type:
        alerts = [a for a in alerts if a["attack_type"] == attack_type]
    return alerts[:limit]


@router.get("/alerts/{alert_id}")
def get_alert(alert_id: int):
    record = service.get_alert(alert_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return record


@router.get("/explainability/{alert_id}")
def get_explainability(alert_id: int):
    record = service.get_alert(alert_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {
        "alert_id": alert_id,
        "entity_id": record["entity_id"],
        "risk_score": record["risk_score"],
        "tier": record["tier"],
        "feature_impacts": record["feature_impacts"],
        "rationale": record["rationale"],
        "model_confidence": record["classifier_score"],
        "note": "Feature impacts are real SHAP TreeExplainer values from the "
                "existing classifier, not simulated.",
    }


@router.get("/threat-summary")
def threat_summary():
    return service.get_threat_summary()


@router.get("/entities")
def list_entities():
    return service.get_entities()


@router.get("/entities/{entity_id}")
def get_entity(entity_id: str):
    record = service.get_entity(entity_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Entity not found or has no alerts yet")
    return record


@router.get("/metrics")
def metrics():
    return service.get_metrics()


@router.post("/run-detection")
def run_detection(req: RunDetectionRequest):
    if not service.ready:
        raise HTTPException(status_code=503, detail="Detection engine still training, try again shortly")
    produced = service.run_detection_batch(n_events=req.n_events)
    return {
        "status": "completed",
        "events_processed": len(produced),
        "metrics": service.get_metrics(),
    }


@router.post("/response/{alert_id}/confirm")
def confirm_response(alert_id: int):
    record = service.confirm_response(alert_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {
        "status": "confirmed",
        "alert_id": alert_id,
        "note": "This is a simulated/logged confirmation only. No host isolation, "
                "credential revocation, or other destructive action is performed.",
        "alert": record,
    }


