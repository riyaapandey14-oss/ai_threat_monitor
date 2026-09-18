import { useEffect, useState } from "react";
import { Panel, LoadingState, ErrorState, SeverityBadge } from "../components/ui";
import AlertDetailModal from "../components/AlertDetailModal";
import { getAlerts, confirmResponse } from "../services/api";

const TIER_ACTIONS = {
  low: ["Auto Log"],
  medium: ["Alert Analyst", "Recommend Action"],
  high: ["Containment Pending Confirmation"],
};

export default function ResponseCenter() {
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = () =>
    getAlerts({ limit: 1000 })
      .then((data) => {
        setAlerts(data);
        setError(false);
      })
      .catch(() => setError(true));

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  const handleConfirm = async (id) => {
    await confirmResponse(id);
    load();
  };

  if (error) return <ErrorState message="Could not load alerts from the backend." />;
  if (!alerts) return <LoadingState label="Loading response center..." />;

  const grouped = { high: [], medium: [], low: [] };
  alerts.forEach((a) => grouped[a.tier]?.push(a));

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-slate-100">Response Center</h1>
      <p className="text-sm text-slate-400">
        No destructive actions are performed. High-severity confirmations are simulated and
        logged only.
      </p>

      {["high", "medium", "low"].map((tier) => (
        <Panel key={tier} title={`${tier.toUpperCase()} (${grouped[tier].length})`}>
          <div className="text-xs text-slate-500 mb-3">
            Actions: {TIER_ACTIONS[tier].join(", ")}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {grouped[tier].slice(0, 12).map((a) => (
              <div key={a.id} className="bg-[#0e1729] border border-[#22304a] rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-sm text-slate-100">{a.entity_id}</span>
                  <SeverityBadge tier={a.tier} />
                </div>
                <div className="text-xs text-slate-400 mb-2">
                  Risk {a.risk_score.toFixed(1)} · {a.attack_type}
                </div>
                <div className="text-xs text-slate-500 mb-3">
                  Response status: {a.response_status}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelected(a)}
                    className="flex-1 text-xs font-semibold border border-[#22304a] rounded-lg py-1.5 text-slate-300 hover:bg-white/[0.05]"
                  >
                    Review Alert
                  </button>
                  {tier === "high" && !a.confirmed && (
                    <button
                      onClick={() => handleConfirm(a.id)}
                      className="flex-1 text-xs font-semibold border border-red-500/40 bg-red-600/10 text-red-300 rounded-lg py-1.5 hover:bg-red-600/20"
                    >
                      Confirm Containment
                    </button>
                  )}
                </div>
              </div>
            ))}
            {grouped[tier].length === 0 && (
              <div className="text-slate-500 text-sm">No alerts in this tier yet.</div>
            )}
          </div>
        </Panel>
      ))}

      <AlertDetailModal alert={selected} onClose={() => setSelected(null)} onConfirm={handleConfirm} />
    </div>
  );
}
