import { useEffect, useState } from "react";
import { Panel, StatCard, LoadingState, ErrorState } from "../components/ui";
import { getMetrics } from "../services/api";

export default function ModelPerformance() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = () =>
      getMetrics()
        .then((m) => {
          setMetrics(m);
          setError(false);
        })
        .catch(() => setError(true));
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  if (error) return <ErrorState message="Could not load metrics from the backend." />;
  if (!metrics) return <LoadingState label="Loading performance metrics..." />;

  const ov = metrics.offline_validation;
  const sim = metrics.simulation_performance;

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-slate-100">Model Performance</h1>

      <Panel title="Offline Validation (held-out synthetic test split)">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Accuracy" value={`${(ov.accuracy * 100).toFixed(1)}%`} />
          <StatCard label="Precision" value={`${(ov.precision * 100).toFixed(1)}%`} />
          <StatCard label="Recall" value={`${(ov.recall * 100).toFixed(1)}%`} />
          <StatCard label="F1 Score" value={`${(ov.f1_score * 100).toFixed(1)}%`} />
          <StatCard label="ROC-AUC" value={ov.roc_auc.toFixed(4)} />
        </div>
        <p className="text-xs text-slate-500 mt-3">{ov.note} Test set size: {ov.test_set_size} events.</p>
      </Panel>

      <Panel title="Current Simulation Performance">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Events processed" value={sim.events_processed} />
          <StatCard
            label="Throughput"
            value={sim.throughput_events_per_sec ? `${sim.throughput_events_per_sec} evt/s` : "—"}
          />
          <StatCard label="Avg latency" value={sim.avg_latency_ms ? `${sim.avg_latency_ms} ms` : "—"} />
          <StatCard label="P95 latency" value={sim.p95_latency_ms ? `${sim.p95_latency_ms} ms` : "—"} />
        </div>
        <p className="text-xs text-slate-500 mt-3">{metrics.note}</p>
      </Panel>
    </div>
  );
}
