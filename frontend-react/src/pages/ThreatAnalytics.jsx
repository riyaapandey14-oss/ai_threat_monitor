import { useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Panel, LoadingState, ErrorState, ResearchTag } from "../components/ui";
import { getAlerts, getThreatSummary, getMetrics } from "../services/api";

const TIER_COLORS = { low: "#4caf50", medium: "#e0a326", high: "#e74c3c" };
const TYPE_COLORS = ["#3b82f6", "#e74c3c", "#e0a326", "#8b5cf6", "#22c55e"];

export default function ThreatAnalytics() {
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = () =>
      Promise.all([getThreatSummary(), getAlerts({ limit: 1000 }), getMetrics()])
        .then(([s, a, m]) => {
          setSummary(s);
          setAlerts(a);
          setMetrics(m);
          setError(false);
        })
        .catch(() => setError(true));
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  if (error) return <ErrorState message="Could not load analytics from the backend." />;
  if (!summary || !alerts || !metrics) return <LoadingState label="Loading analytics..." />;

  const typeData = Object.entries(summary.by_attack_type).map(([name, value]) => ({ name, value }));
  const tierData = Object.entries(summary.by_tier).map(([name, value]) => ({ name, value }));
  const riskBuckets = Array.from({ length: 10 }, (_, i) => ({
    bucket: `${i * 10}-${i * 10 + 9}`,
    count: alerts.filter((a) => a.risk_score >= i * 10 && a.risk_score < i * 10 + 10).length,
  }));

  const sample = alerts.slice(0, 3);

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-slate-100">Threat Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="Threat distribution by attack type">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={typeData} dataKey="value" nameKey="name" outerRadius={90} label>
                {typeData.map((_, i) => (
                  <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#131c31", border: "1px solid #22304a" }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Alert severity distribution">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={tierData}>
              <CartesianGrid stroke="#22304a" />
              <XAxis dataKey="name" stroke="#93a1bd" fontSize={12} />
              <YAxis stroke="#93a1bd" fontSize={12} />
              <Tooltip contentStyle={{ background: "#131c31", border: "1px solid #22304a" }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {tierData.map((d) => (
                  <Cell key={d.name} fill={TIER_COLORS[d.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Risk score distribution">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={riskBuckets}>
              <CartesianGrid stroke="#22304a" />
              <XAxis dataKey="bucket" stroke="#93a1bd" fontSize={11} />
              <YAxis stroke="#93a1bd" fontSize={12} />
              <Tooltip contentStyle={{ background: "#131c31", border: "1px solid #22304a" }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Detection performance (this session)">
          <div className="grid grid-cols-3 gap-3 h-full items-center">
            <Metric label="Throughput" value={`${metrics.simulation_performance.throughput_events_per_sec ?? "—"} evt/s`} />
            <Metric label="Avg latency" value={`${metrics.simulation_performance.avg_latency_ms ?? "—"} ms`} />
            <Metric label="P95 latency" value={`${metrics.simulation_performance.p95_latency_ms ?? "—"} ms`} />
          </div>
        </Panel>
      </div>

      <Panel title="Attack Correlation" right={<ResearchTag />}>
        <p className="text-sm text-slate-400 mb-4">
          The MVP does not implement a graph neural network or cross-signal correlation engine.
          What follows is a correlation view built only from relationships already present in the
          existing event/alert data (entity → attack type → risk), to illustrate the concept
          proposed as a research extension — not a claim that GNN-based correlation is running.
        </p>
        <div className="space-y-3">
          {sample.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-sm flex-wrap">
              <Node label="User/Host" value={a.entity_id} />
              <Arrow />
              <Node label="Activity" value={a.attack_type} />
              <Arrow />
              <Node label="Risk" value={a.risk_score.toFixed(1)} />
              <Arrow />
              <Node label="Response" value={a.action.replaceAll("_", " ")} />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-xl font-bold text-slate-100 mt-1">{value}</div>
    </div>
  );
}

function Node({ label, value }) {
  return (
    <div className="bg-[#0e1729] border border-[#22304a] rounded-lg px-3 py-1.5">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="text-slate-200 font-mono text-xs">{value}</div>
    </div>
  );
}

function Arrow() {
  return <span className="text-slate-600">→</span>;
}
