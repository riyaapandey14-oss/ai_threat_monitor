import { SeverityBadge } from "./ui";
import FeatureImpactChart from "./FeatureImpactChart";

export default function AlertDetailModal({ alert, onClose, onConfirm }) {
  if (!alert) return null;
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#131c31] border border-[#22304a] rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs text-slate-400">Alert #{alert.id}</div>
            <div className="text-xl font-bold font-mono text-slate-100">{alert.entity_id}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-lg">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <Field label="Risk" value={`${alert.risk_score.toFixed(1)}/100`} />
          <Field label="Severity" value={<SeverityBadge tier={alert.tier} />} />
          <Field label="Attack type" value={alert.attack_type} />
        </div>

        <div className="mb-5">
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">
            Recommended action
          </div>
          <div className="text-sm text-slate-200">{alert.action.replaceAll("_", " ")}</div>
          <div className="text-xs text-slate-500 mt-1">
            Response status: {alert.response_status}
          </div>
        </div>

        <div className="mb-5">
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">
            Why was this alert generated? (SHAP feature attribution)
          </div>
          <FeatureImpactChart impacts={alert.feature_impacts} />
          <div className="text-xs text-slate-500 mt-2">
            Positive impact (red) = increased risk. Negative impact (blue) = reduced risk.
          </div>
        </div>

        {alert.tier === "high" && !alert.confirmed && onConfirm && (
          <button
            onClick={() => onConfirm(alert.id)}
            className="w-full bg-red-600/20 border border-red-500/40 text-red-300 rounded-lg py-2 text-sm font-semibold hover:bg-red-600/30"
          >
            Confirm Containment (simulated)
          </button>
        )}
        {alert.confirmed && (
          <div className="text-center text-sm text-emerald-400 border border-emerald-500/30 rounded-lg py-2 bg-emerald-500/10">
            Response confirmed (simulated / logged only)
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm font-semibold text-slate-100 mt-0.5">{value}</div>
    </div>
  );
}
