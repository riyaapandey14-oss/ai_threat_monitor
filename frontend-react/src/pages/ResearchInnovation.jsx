import { Panel, ResearchTag } from "../components/ui";

const IMPLEMENTED = [
  "Ensemble AI anomaly detection (supervised classifier + unsupervised autoencoder + behavioral deviation)",
  "Composite 0-100 risk scoring with low/medium/high tiering",
  "Real SHAP-based explainability per alert",
  "Real-time event simulation over WebSocket",
  "Alert prioritization, search, filtering, and sorting",
  "Human-in-the-loop response workflow (simulated confirmation, no destructive actions)",
  "Offline validation metrics and live simulation performance monitoring",
];

const RESEARCH = [
  {
    title: "Cross-signal graph correlation",
    problem: "Single-signal detectors miss coordinated, multi-stage attacks like lateral movement.",
    solution: "Model entities/processes/network activity as a graph; apply GNN-based scoring.",
    benefit: "Detects multi-stage attacks invisible to any single detector.",
  },
  {
    title: "Self-supervised cold-start reduction",
    problem: "Behavioral baselining needs 60-90 days of clean data before it's reliable.",
    solution: "Contrastive self-supervised pretraining on unlabeled traffic.",
    benefit: "Usable baseline in days instead of months.",
  },
  {
    title: "Concept drift detection",
    problem: "Fixed-schedule retraining leaves models stale as traffic patterns shift.",
    solution: "Statistical drift detection (e.g., ADWIN) triggers targeted retraining.",
    benefit: "Keeps the model current without unnecessary retraining cost.",
  },
  {
    title: "Adversarial robustness",
    problem: "AI detectors are demonstrably vulnerable to crafted evasive inputs.",
    solution: "Adversarial training and periodic red-team evaluation.",
    benefit: "Closes a well-documented, largely unaddressed vulnerability class.",
  },
  {
    title: "Federated / privacy-preserving learning",
    problem: "Organizations can't share raw security data across tenants/partners.",
    solution: "Federated aggregation of model updates, not raw data.",
    benefit: "Shared threat intelligence without centralizing sensitive data.",
  },
  {
    title: "Edge-lightweight deployment",
    problem: "Deep models are too heavy for resource-constrained edge/IoT gateways.",
    solution: "Compressed/quantized model export (e.g., ONNX) for edge inference.",
    benefit: "Local, low-latency detection at the network edge.",
  },
];

export default function ResearchInnovation() {
  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-slate-100">Research &amp; Innovation</h1>

      <Panel title="Implemented in this MVP">
        <ul className="space-y-2 text-sm text-slate-300">
          {IMPLEMENTED.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-emerald-400">✔</span>
              {item}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Research extensions / future work" right={<ResearchTag />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RESEARCH.map((r) => (
            <div key={r.title} className="bg-[#0e1729] border border-[#22304a] rounded-lg p-4">
              <div className="font-semibold text-slate-100 mb-2">{r.title}</div>
              <div className="text-xs text-slate-400 space-y-1.5">
                <div><span className="text-slate-500">Problem: </span>{r.problem}</div>
                <div><span className="text-slate-500">Proposed solution: </span>{r.solution}</div>
                <div><span className="text-slate-500">Expected benefit: </span>{r.benefit}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
