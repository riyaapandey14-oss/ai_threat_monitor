import { Panel } from "../components/ui";

const DEMO_STEPS = [
  "Start the backend (uvicorn) and frontend (npm run dev), open the Dashboard.",
  "Click 'Run Detection' to process a fresh batch of synthetic events.",
  "Open Alerts, filter by severity = low, point out normal traffic scoring near 0.",
  "Filter by severity = high, open a high-risk alert to show suspicious behavior.",
  "In the alert detail panel, show the composite risk score (0-100).",
  "Point to the SHAP feature-impact chart: 'this is WHY the AI flagged it.'",
  "Point to the attack_type field to show the classified attack category.",
  "Open Response Center, show the tiered recommended action for that alert.",
  "Click 'Confirm Containment' to show the simulated (non-destructive) response.",
  "Open Model Performance to show offline validation and live simulation metrics.",
];

export default function About() {
  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-slate-100">Settings / About / Judge Demo Mode</h1>

      <Panel title="Judge Demo Mode — suggested walkthrough">
        <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside">
          {DEMO_STEPS.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </Panel>

      <Panel title="Limitations (stated plainly)">
        <ul className="space-y-2 text-sm text-slate-400 list-disc list-inside">
          <li>All data is synthetic, generated for demonstration purposes — not real network traffic.</li>
          <li>The detector is a Gradient Boosted Trees classifier + MLP autoencoder, not the CNN-LSTM hybrid described in the project's long-term design.</li>
          <li>Attack-correlation and graph-based detection are illustrative only — no GNN is implemented.</li>
          <li>Response actions are simulated and logged only; nothing is actually isolated, blocked, or revoked.</li>
          <li>Offline validation metrics (100% accuracy on some runs) reflect a cleanly-separable synthetic dataset, not real-world performance.</li>
        </ul>
      </Panel>

      <Panel title="About">
        <p className="text-sm text-slate-400">
          AI-Based Anomaly Detection and Real-Time Threat Monitoring System — an educational MVP
          combining an ensemble detection pipeline, explainable AI, a FastAPI backend, and a
          React SOC dashboard. See the Research &amp; Innovation page for the full list of
          implemented vs. proposed features.
        </p>
      </Panel>
    </div>
  );
}
