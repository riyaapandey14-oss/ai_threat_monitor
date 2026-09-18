"""
Detection service layer.

This module is the ONLY place the FastAPI backend touches the existing
detection pipeline. It imports the existing modules exactly as they are --
detection_engine.py, explainability.py, risk_scoring.py, response.py,
ingestion.py, data/synthetic_data.py -- and does not modify or duplicate
any of their logic. It only:

  1. Trains the engine once (same call sequence as pipeline.py).
  2. Runs batches of events through the existing scoring pipeline.
  3. Assigns an alert_id and timestamp to each existing response record
     (response.py's ResponseOrchestrator.handle() does not include these,
     so we attach them here rather than changing that file's return shape).
  4. Keeps an in-memory store (+ optional JSON persistence to the existing
     outputs/alert_log.json format) that both the REST endpoints and the
     WebSocket read from, so "live" and "polled" views stay consistent.

No detection, scoring, or explainability logic lives in this file --
it is pure orchestration and storage on top of code that already exists.
"""

import itertools
import json
import os
import time
from threading import Lock

import numpy as np
from sklearn.metrics import (accuracy_score, f1_score, precision_score,
                              recall_score, roc_auc_score)
from sklearn.model_selection import train_test_split

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sys  # noqa: E402
sys.path.insert(0, PROJECT_ROOT)

from data.synthetic_data import generate_dataset      # noqa: E402
from detection_engine import DetectionEngine           # noqa: E402
from explainability import Explainer                   # noqa: E402
from ingestion import StreamIngestor                    # noqa: E402
from response import ResponseOrchestrator               # noqa: E402
from risk_scoring import composite_risk_score, risk_tier  # noqa: E402

OUTPUTS_DIR = os.path.join(PROJECT_ROOT, "outputs")
ALERT_LOG_PATH = os.path.join(OUTPUTS_DIR, "alert_log.json")


class DetectionService:
    """Singleton-style service holding the trained engine and alert store."""

    def __init__(self):
        self._lock = Lock()
        self.engine = None
        self.explainer = None
        self.offline_validation = None
        self.ready = False

        self.alerts = []                 # list of enriched alert records
        self._alert_index = {}           # alert_id -> record (fast lookup)
        self._id_counter = itertools.count(1)
        self._seed_counter = itertools.count(1000)

        self.simulation_metrics = {
            "events_processed": 0,
            "throughput_events_per_sec": None,
            "avg_latency_ms": None,
            "p95_latency_ms": None,
            "last_run_at": None,
        }
        self._latencies = []

    # ---------------- training (same sequence as pipeline.py) ----------------
    def train(self):
        X, y, _ = generate_dataset(n_normal=6000, n_attacks_each=300, seed=42)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.25, stratify=y, random_state=42
        )

        engine = DetectionEngine()
        engine.train(X_train, y_train)

        X_test_scaled = engine.fe.scaler.transform(X_test.values)
        proba = engine.classifier.predict_proba(X_test_scaled)
        preds = (proba >= 0.5).astype(int)

        self.offline_validation = {
            "accuracy": round(float(accuracy_score(y_test, preds)), 4),
            "precision": round(float(precision_score(y_test, preds)), 4),
            "recall": round(float(recall_score(y_test, preds)), 4),
            "f1_score": round(float(f1_score(y_test, preds)), 4),
            "roc_auc": round(float(roc_auc_score(y_test, proba)), 4),
            "test_set_size": int(len(y_test)),
            "note": "Offline validation on a held-out synthetic test split. "
                    "Not a measurement of real-world production performance.",
        }

        self.engine = engine
        self.explainer = Explainer(engine.classifier.model)
        self.ready = True
        return self.offline_validation

    # ---------------- core: score one event and store the alert ----------------
    def _score_and_store(self, event, true_type):
        t0 = time.time()
        signals = self.engine.score_event(event)
        score = composite_risk_score(signals)
        tier = risk_tier(score)
        pairs = self.explainer.explain(signals["scaled_features"])
        rationale = Explainer.to_rationale(pairs)

        # response.py is used exactly as-is; we only attach bookkeeping fields
        # (id/timestamp/scores) around its unmodified return value.
        responder_record = ResponseOrchestrator().handle(
            event, score, tier, rationale, event["entity_id"]
        )

        latency_ms = round((time.time() - t0) * 1000, 3)
        alert_id = next(self._id_counter)

        record = {
            "id": alert_id,
            "timestamp": time.time(),
            "entity_id": responder_record["entity_id"],
            "risk_score": responder_record["risk_score"],
            "tier": responder_record["tier"],
            "action": responder_record["action"],
            "rationale": responder_record["rationale"],
            "feature_impacts": [{"feature": f, "impact": round(float(v), 3)} for f, v in pairs],
            "attack_type": true_type,   # demo-only label from the synthetic generator
            "classifier_score": round(float(signals["classifier_score"]), 4),
            "ae_score": round(float(signals["ae_score"]), 4),
            "deviation_score": round(float(signals["deviation_score"]), 4),
            "latency_ms": latency_ms,
            "response_status": "pending_confirmation" if tier == "high" else "n/a",
            "confirmed": False,
        }

        with self._lock:
            self.alerts.append(record)
            self._alert_index[alert_id] = record
            self._latencies.append(latency_ms)
            self.simulation_metrics["events_processed"] += 1

        return record

    # ---------------- batch run (used by POST /api/run-detection) ----------------
    def run_detection_batch(self, n_events=300):
        assert self.ready, "call train() first"
        seed = next(self._seed_counter)
        ingestor = StreamIngestor(batch_size=32, seed=seed)

        start = time.time()
        produced = []
        while ingestor.has_more() and len(produced) < n_events:
            for event, _, true_type in ingestor.poll():
                produced.append(self._score_and_store(event, true_type))
                if len(produced) >= n_events:
                    break
        elapsed = time.time() - start

        recent = [r["latency_ms"] for r in produced] or [0]
        with self._lock:
            self.simulation_metrics.update({
                "throughput_events_per_sec": round(len(produced) / elapsed, 1) if elapsed > 0 else None,
                "avg_latency_ms": round(float(np.mean(recent)), 3),
                "p95_latency_ms": round(float(np.percentile(recent, 95)), 3),
                "last_run_at": time.time(),
            })

        self._persist_alert_log()
        return produced

    # ---------------- one event at a time, for the WebSocket ----------------
    def score_one_live(self, event, true_type):
        return self._score_and_store(event, true_type)

    def make_ingestor(self):
        seed = next(self._seed_counter)
        return StreamIngestor(batch_size=16, seed=seed)

    # ---------------- persistence (reuses the existing alert_log.json shape) ----------------
    def _persist_alert_log(self):
        os.makedirs(OUTPUTS_DIR, exist_ok=True)
        # Keep the exact shape pipeline.py's save_results() already produces
        # (entity_id/risk_score/tier/action/rationale) for compatibility with
        # anything already reading that file, e.g. dashboard.py.
        legacy_shape = [
            {
                "entity_id": r["entity_id"],
                "risk_score": r["risk_score"],
                "tier": r["tier"],
                "action": r["action"],
                "rationale": r["rationale"],
            }
            for r in self.alerts
        ]
        with open(ALERT_LOG_PATH, "w") as f:
            json.dump(legacy_shape, f, indent=2)

    # ---------------- read APIs ----------------
    def get_alerts(self):
        return list(reversed(self.alerts))

    def get_alert(self, alert_id):
        return self._alert_index.get(alert_id)

    def get_threat_summary(self):
        by_type = {}
        for r in self.alerts:
            by_type[r["attack_type"]] = by_type.get(r["attack_type"], 0) + 1
        by_tier = {"low": 0, "medium": 0, "high": 0}
        for r in self.alerts:
            by_tier[r["tier"]] += 1
        return {"by_attack_type": by_type, "by_tier": by_tier, "total": len(self.alerts)}

    def get_entities(self):
        entities = {}
        for r in self.alerts:
            e = entities.setdefault(r["entity_id"], {
                "entity_id": r["entity_id"], "alert_count": 0,
                "max_risk": 0, "attack_types": set(), "last_seen": 0,
            })
            e["alert_count"] += 1
            e["max_risk"] = max(e["max_risk"], r["risk_score"])
            e["attack_types"].add(r["attack_type"])
            e["last_seen"] = max(e["last_seen"], r["timestamp"])
        out = []
        for e in entities.values():
            e = dict(e)
            e["attack_types"] = sorted(e["attack_types"])
            out.append(e)
        return sorted(out, key=lambda x: -x["max_risk"])

    def get_entity(self, entity_id):
        history = [r for r in self.alerts if r["entity_id"] == entity_id]
        if not history:
            return None
        return {
            "entity_id": entity_id,
            "alert_count": len(history),
            "max_risk": max(r["risk_score"] for r in history),
            "history": list(reversed(history)),
        }

    def confirm_response(self, alert_id):
        record = self._alert_index.get(alert_id)
        if record is None:
            return None
        record["confirmed"] = True
        record["response_status"] = "confirmed_simulated"
        return record

    def get_metrics(self):
        return {
            "offline_validation": self.offline_validation,
            "simulation_performance": self.simulation_metrics,
            "note": "simulation_performance reflects this synthetic demo run, "
                    "not a real production deployment.",
        }


service = DetectionService()
