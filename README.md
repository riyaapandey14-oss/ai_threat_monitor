# AI-Based Anomaly Detection & Real-Time Threat Monitoring — MVP

A working, runnable MVP of the five-stage pipeline described in the project
documentation: **ingestion → feature engineering → detection engine →
explainability/risk scoring → response**, plus a continuous feedback point
ready for retraining.

This MVP proves the architecture end-to-end on synthetic data before you
invest in real data pipelines, GPUs, or production infrastructure.

## What's actually implemented

| Stage | File | What it does now | Production swap-in |
|---|---|---|---|
| Ingestion | `ingestion.py` | Simulates a Kafka-style consumer (`poll()`) over synthetic events | Real `kafka-python` / Kinesis consumer — same interface |
| Data source | `data/synthetic_data.py` | Generates labeled normal + 4 attack patterns (port scan, brute force, data exfiltration, lateral movement) | Real NetFlow / EDR / auth logs, normalized to OCSF |
| Feature engineering | `features.py` | StandardScaler + per-entity rolling behavioral deviation (own-baseline drift) | Same design, backed by Flink/Spark windowed aggregation |
| Detection — unsupervised | `models/autoencoder.py` | Bottlenecked MLP autoencoder trained only on normal traffic; reconstruction error = anomaly score | Small PyTorch/TF autoencoder, ONNX-exported for edge |
| Detection — supervised | `models/classifier.py` | Gradient Boosted Trees (fast, CPU-only, well-calibrated probabilities) | Lightweight hybrid CNN-LSTM (per Rahmati 2025 / ELAI) on sequence-windowed input |
| Ensemble | `detection_engine.py` | Combines classifier score + autoencoder score + behavioral deviation | Add GNN cross-signal correlation (Phase 3 feature) |
| Explainability | `explainability.py` | SHAP TreeExplainer — top-3 contributing features per alert | Same approach; add attention weights once CNN-LSTM is in place |
| Risk scoring | `risk_scoring.py` | Weighted composite 0–100 score + low/medium/high tier | Same design; weights become configurable/tunable per environment |
| Response | `response.py` | Tiered: log / analyst alert / containment-pending-confirmation | Wire `high` tier into a real SOAR playbook (host isolation, credential revocation) |
| Dashboard | `dashboard.py` | Static PNG summary (risk distribution, alert volumes) | Grafana or a live Streamlit app |

**Not yet implemented** (explicitly out of scope for this MVP, called out in
the project documentation as Phase 3+ features): cross-signal graph
correlation (GNN), self-supervised cold-start reduction, concept-drift-
triggered retraining, adversarial-robustness testing, and federated
multi-tenant learning.

## Why scikit-learn instead of PyTorch for the detection models

The full design specifies a CNN-LSTM hybrid. For the MVP we substitute
scikit-learn equivalents (Gradient Boosted Trees + an MLP autoencoder) that:

- expose the same `.fit()` / `.predict_proba()` interface, so swapping in a
  real deep learning model later only touches `models/` and
  `detection_engine.py`;
- train and infer in milliseconds on CPU with no GPU or large framework
  install required, which matches the project's own "lightweight, edge-
  deployable" design goal;
- let you validate the entire pipeline — ingestion through response — today,
  rather than blocking on a training-infrastructure setup.

## Quickstart

```bash
pip install -r requirements.txt

# Train the detection engine and run a live-stream simulation
python pipeline.py

# Render a summary dashboard from the resulting alert log
python dashboard.py
```

`pipeline.py` will:
1. Generate a labeled synthetic dataset (normal + 4 attack types) and hold
   out a test split.
2. Train the autoencoder (on normal traffic only) and the classifier
   (on the full labeled set), and print offline validation metrics.
3. Simulate a real-time event stream through the full detection →
   explainability → risk scoring → response pipeline.
4. Print throughput/latency numbers, alert-tier volumes, detection
   breakdown by true attack type, and the top 5 highest-risk alerts with
   their SHAP-based rationale.
5. Save the full alert log to `outputs/alert_log.json`.

## Example output (synthetic data, illustrative)

```
--- Real-time performance ---
Events processed:        1200
Throughput:              ~1,500 events/sec (single CPU core, no batching/GPU)
Avg per-event latency:   <1 ms

--- Alert volume by tier ---
     low: 986
  medium: 7
    high: 207
```

Note: accuracy on this synthetic dataset is near-perfect because the
generated attack patterns are cleanly separable by design (useful for
verifying the pipeline wiring). Real traffic will be noisier — expect to
spend real tuning effort on the risk-score weights (`risk_scoring.py`) and
classifier hyperparameters once you swap in production data.

## Next steps toward the full design

1. **Replace synthetic data** with a real ingestion source (start with a
   public benchmark like CICIDS2017/UNSW-NB15 for offline validation before
   live traffic).
2. **Swap the classifier** for the CNN-LSTM hybrid once you have sequence-
   windowed data and a training environment with PyTorch/TensorFlow.
3. **Add the graph correlation engine** (Phase 3) once you have entity
   relationship data (auth logs, process trees) to build the graph from.
4. **Wire the `high` tier into a real SOAR action** instead of the current
   log-only placeholder in `response.py`.
5. **Add concept-drift detection** to trigger retraining automatically
   instead of the manual `pipeline.py` re-run used here.

## Project structure

```
ai_threat_monitor/
├── data/
│   └── synthetic_data.py     # synthetic event generator
├── models/
│   ├── autoencoder.py        # unsupervised baseliner
│   └── classifier.py         # supervised detector
├── ingestion.py               # streaming ingestion interface
├── features.py                 # scaling + behavioral baselining
├── detection_engine.py        # ensemble of the two models
├── explainability.py           # SHAP-based rationale
├── risk_scoring.py             # composite 0-100 score + tiering
├── response.py                  # tiered alerting / containment gating
├── pipeline.py                  # end-to-end batch orchestration (run this for the CLI demo)
├── dashboard.py                 # static PNG run summary
├── backend/
│   ├── main.py                  # FastAPI app: reuses the pipeline modules, streams live scored events over WebSocket
│   └── requirements.txt
├── frontend/
│   └── index.html                # real-time SOC dashboard (React via CDN, Chart.js, no build step)
├── requirements.txt
└── outputs/                     # generated: alert_log.json, dashboard.png
```

## Full SOC product (backend + React dashboard) — recommended for demos/judging

This adds a FastAPI backend (`backend/`) and a full React + Vite + Tailwind +
Recharts dashboard (`frontend-react/`) on top of the **unmodified** detection
pipeline. The original CLI workflow (`python pipeline.py`, `python
dashboard.py`) still works exactly as before — see the section below for that.

### Run it (two terminals, from the `ai_threat_monitor/` root)

```bash
# Terminal 1 — backend (trains the engine, seeds one detection batch, serves the API)
pip install -r requirements.txt
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend-react
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api/*` and
`/ws/*` to the backend on port 8000 (configured in `vite.config.js`), so no
CORS issues and no manual URL configuration.

### Pages

Dashboard · Live Monitoring · Alerts · Entities · Threat Analytics ·
Explainable AI · Response Center · Model Performance · Research & Innovation
· Settings/About (includes a Judge Demo Mode walkthrough and a plainly
stated limitations list).

### API endpoints (backend/api/routes.py + backend/main.py)

```
GET  /api/health
GET  /api/alerts                 (filters: severity, attack_type, limit)
GET  /api/alerts/{alert_id}
GET  /api/explainability/{alert_id}
GET  /api/threat-summary
GET  /api/entities
GET  /api/entities/{entity_id}
GET  /api/metrics
POST /api/run-detection          { "n_events": 300 }
POST /api/response/{alert_id}/confirm
WS   /ws/alerts                  live event-by-event stream
```

### What's real vs. simulated in this layer

- All alert data, risk scores, SHAP feature impacts, and offline validation
  metrics shown in the dashboard come directly from the existing pipeline
  modules — nothing is hard-coded in the frontend or backend.
- "Confirm Containment" and all response actions are **simulated and logged
  only** — no host isolation, credential revocation, or other destructive
  action is ever performed.
- The Attack Correlation view is explicitly labeled a research extension; it
  visualizes relationships already present in the alert data (entity → attack
  type → response) and does not claim a graph neural network is running.
- Attention-weight visualization is labeled "Planned / Research Extension"
  since the current classifier (Gradient Boosted Trees) doesn't produce
  attention weights — only a real CNN-LSTM/transformer would.

## Real-time SOC dashboard, CDN version (superseded by the React app above)

The original lightweight, no-build-step dashboard from the previous MVP
iteration is preserved at `frontend/legacy_dashboard.html` and still works
standalone against `backend/main.py`'s original `/ws/stream` endpoint if you
ever want the zero-dependency version back.

## Real-time SOC dashboard (recommended demo)

This is the stronger way to present the project: a live web dashboard
instead of a static PNG. It reuses every pipeline module unchanged --
`backend/main.py` is purely a web layer on top of `detection_engine.py`,
`explainability.py`, `risk_scoring.py`, and `response.py`.

**What it shows, live:** entity ID, composite risk score, tier badge,
response action, per-event latency, and the SHAP rationale — streamed over
a WebSocket and rendered as a scrolling analyst queue plus a live risk-score
chart and tier counters.

### Run it (VS Code / local machine)

```bash
cd ai_threat_monitor
pip install -r requirements.txt
pip install -r backend/requirements.txt

uvicorn backend.main:app --reload --port 8000
```

Then open **http://localhost:8000** in a browser. The detection engine
trains once at startup (a few seconds), then the dashboard connects
automatically and starts streaming.

No `npm install` or build step is required — the frontend is a single
`index.html` that loads React, Babel, and Chart.js from CDNs directly in
the browser. If you later want a proper build pipeline (Vite + component
structure), the same WebSocket contract (`/ws/stream` emitting the JSON
shape produced by `response.ResponseOrchestrator.handle()`) lets you swap
in a "real" React app without touching the backend.

### How it's wired

1. **Startup**: `backend/main.py` imports the existing `DetectionEngine`,
   trains it once on synthetic data (swap for real data per the steps
   below), and keeps it in memory.
2. **`/ws/stream`**: for each connected browser tab, a fresh
   `StreamIngestor` feeds events through `score_event()` →
   `composite_risk_score()` → `Explainer.explain()` → `ResponseOrchestrator.handle()`,
   and the resulting record is pushed to the browser as JSON, paced at
   ~8 events/sec so it's watchable rather than instant.
3. **Frontend**: a `useEffect` hook opens the WebSocket once, appends each
   incoming record to the alert table (capped at the most recent 60 rows),
   updates the tier counters, and pushes the risk score onto a rolling
   Chart.js line chart.

### On "validation, not another model" (the more important next step)

Before adding more model sophistication, the highest-value next step is
tightening the experimental methodology, since the current numbers (100%
AUC) come from cleanly-separable synthetic data:

- Validate against a real benchmark (CICIDS2017 or UNSW-NB15) instead of
  synthetic data, and report precision/recall/F1 **per attack type**, not
  just in aggregate.
- Add a proper train/validation/test split with **time-based** splitting
  (train on earlier traffic, test on later) rather than random splitting,
  since random splitting leaks temporal patterns and inflates scores.
- Report false-positive rate at fixed alert-volume budgets (e.g., "at 50
  alerts/day, what's the recall?") since that's what a SOC actually cares
  about, not just ROC-AUC.
- Run an ablation: classifier-only vs. autoencoder-only vs. the full
  ensemble, to justify empirically that combining signals actually helps.
- Only after that: swap `models/classifier.py` for the CNN-LSTM hybrid and
  see if it moves the validated numbers, rather than assuming it will.
