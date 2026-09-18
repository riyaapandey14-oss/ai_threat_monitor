import { useEffect, useState } from "react";
import { StatCard, Panel, LoadingState, ErrorState } from "../components/ui";
import { getMetrics, getThreatSummary, runDetection } from "../services/api";

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");

  const load = () => {
    Promise.all([getMetrics(), getThreatSummary()])
      .then(([m, s]) => {
        setMetrics(m);
        setSummary(s);
        setError(false);
      })
      .catch(() => setError(true));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 6000);
    return () => clearInterval(id);
  }, []);

  const handleRun = async () => {
    setRunning(true);
    const steps = [
      "Preparing data...",
      "Running detection...",
      "Processing events...",
      "Generating explanations...",
      "Updating dashboard...",
    ];
    for (const s of steps) {
      setProgress(s);
      await new Promise((r) => setTimeout(r, 350));
    }
    try {
      await runDetection(300);
      setProgress("Completed.");
      load();
    } catch (e) {
      setProgress("Failed to run detection.");
    } finally {
      setTimeout(() => setRunning(false), 800);
    }
  };

  if (error) return <ErrorState message="Could not reach the backend API. Is uvicorn running on port 8000?" />;
  if (!metrics || !summary) return <LoadingState label="Loading dashboard..." />;

  const tiers = summary.by_tier;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-100">Overview</h1>
        <button
          onClick={handleRun}
          disabled={running}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg"
        >
          {running ? progress : "▶ Run Detection"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Events" value={summary.total} />
        <StatCard
          label="Threats Detected"
          value={summary.total - (summary.by_attack_type.normal || 0)}
        />
        <StatCard label="High Risk" value={tiers.high} accent="high" />
        <StatCard label="Medium Risk" value={tiers.medium} accent="medium" />
        <StatCard label="Low Risk" value={tiers.low} accent="low" />
        <StatCard
          label="Events/sec"
          value={metrics.simulation_performance.throughput_events_per_sec ?? "—"}
        />
        <StatCard
          label="Avg Latency"
          value={
            metrics.simulation_performance.avg_latency_ms != null
              ? `${metrics.simulation_performance.avg_latency_ms} ms`
              : "—"
          }
        />
        <StatCard
          label="Model ROC-AUC"
          value={metrics.offline_validation?.roc_auc ?? "—"}
        />
      </div>

      <Panel title="Attack type breakdown (this session)">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(summary.by_attack_type).map(([type, count]) => (
            <div key={type} className="bg-[#0e1729] border border-[#22304a] rounded-lg p-3">
              <div className="text-xs text-slate-400">{type}</div>
              <div className="text-xl font-bold text-slate-100">{count}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
