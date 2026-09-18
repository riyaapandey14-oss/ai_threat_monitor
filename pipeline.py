"""
End-to-end MVP runner.

Mirrors the five-stage architecture from the project documentation:
  1. Data ingestion       -> ingestion.StreamIngestor
  2. Feature engineering  -> features.FeatureEngineer (used inside DetectionEngine)
  3. Detection engine     -> detection_engine.DetectionEngine (ensemble)
  4. Explainability/score -> explainability.Explainer + risk_scoring
  5. Response             -> response.ResponseOrchestrator

Run: python pipeline.py
"""

import json
import os
import time

import numpy as np
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split

from data.synthetic_data import generate_dataset
from detection_engine import DetectionEngine
from explainability import Explainer
from ingestion import StreamIngestor
from response import ResponseOrchestrator
from risk_scoring import composite_risk_score, risk_tier


def train_detection_engine(seed=42):
    print("[1/5] Generating training data and fitting detection engine...")
    X, y, _ = generate_dataset(n_normal=6000, n_attacks_each=300, seed=seed)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, stratify=y, random_state=seed
    )

    engine = DetectionEngine()
    engine.train(X_train, y_train)

    # Quick offline validation of the supervised half, for sanity checking
    X_test_scaled = engine.fe.scaler.transform(X_test.values)
    proba = engine.classifier.predict_proba(X_test_scaled)
    preds = (proba >= 0.5).astype(int)

    print("\n--- Offline validation (held-out test split) ---")
    print(classification_report(y_test, preds, target_names=["normal", "attack"]))
    print(f"ROC-AUC: {roc_auc_score(y_test, proba):.4f}\n")

    return engine


def run_live_simulation(engine, n_events=1200, seed=7):
    print(f"[2/5] Starting real-time stream simulation ({n_events} events)...")
    ingestor = StreamIngestor(batch_size=32, seed=seed)
    explainer = Explainer(engine.classifier.model)
    responder = ResponseOrchestrator()

    latencies = []
    processed = 0
    detections_by_true_type = {}

    start = time.time()
    while ingestor.has_more() and processed < n_events:
        batch = ingestor.poll()
        for event, true_label, true_type in batch:
            t0 = time.time()
            signals = engine.score_event(event)
            score = composite_risk_score(signals)
            tier = risk_tier(score)

            pairs = explainer.explain(signals["scaled_features"])
            rationale = Explainer.to_rationale(pairs)

            responder.handle(event, score, tier, rationale, event["entity_id"])
            latencies.append((time.time() - t0) * 1000)  # ms

            if tier in ("medium", "high"):
                detections_by_true_type[true_type] = detections_by_true_type.get(true_type, 0) + 1

            processed += 1
            if processed >= n_events:
                break
    elapsed = time.time() - start

    print("[3/5] Stream processing complete.\n")
    print("--- Real-time performance ---")
    print(f"Events processed:        {processed}")
    print(f"Total wall time:         {elapsed:.2f}s")
    print(f"Throughput:              {processed / elapsed:,.0f} events/sec")
    print(f"Avg per-event latency:   {np.mean(latencies):.2f} ms")
    print(f"p95 per-event latency:   {np.percentile(latencies, 95):.2f} ms\n")

    print("--- Alert volume by tier ---")
    for tier_name, count in responder.summary().items():
        print(f"  {tier_name:>6}: {count}")

    print("\n--- Medium/high alerts flagged, by true underlying attack type ---")
    for atype, count in sorted(detections_by_true_type.items(), key=lambda x: -x[1]):
        print(f"  {atype:>18}: {count}")

    print("\n[4/5] Top 5 highest-risk alerts (with explainability rationale):")
    for i, alert in enumerate(responder.top_alerts(5), 1):
        print(f"\n  #{i} entity={alert['entity_id']}  risk={alert['risk_score']}  "
              f"tier={alert['tier']}  action={alert['action']}")
        print(f"      why: {alert['rationale']}")

    return responder


def save_results(responder, path="outputs/alert_log.json"):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(responder.log, f, indent=2)
    print(f"\n[5/5] Full alert log saved to {path}")


if __name__ == "__main__":
    engine = train_detection_engine()
    responder = run_live_simulation(engine)
    save_results(responder)
