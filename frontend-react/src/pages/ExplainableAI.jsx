import { useEffect, useState } from "react";
import { Panel, LoadingState, ErrorState, SeverityBadge, ResearchTag } from "../components/ui";
import FeatureImpactChart from "../components/FeatureImpactChart";
import { getAlerts, getExplainability } from "../services/api";

export default function ExplainableAI() {
  const [alerts, setAlerts] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getAlerts({ limit: 200 })
      .then((data) => {
        setAlerts(data);
        if (data.length) setSelectedId(data[0].id);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    if (selectedId != null) getExplainability(selectedId).then(setExplanation);
  }, [selectedId]);

  if (error) return <ErrorState message="Could not load alerts from the backend." />;
  if (!alerts) return <LoadingState label="Loading..." />;

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-slate-100">Explainable AI</h1>
      <p className="text-sm text-slate-400">
        "What caused the AI to flag this activity?" — select an alert to see the real SHAP
        TreeExplainer output from the existing classifier.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Panel title="Select an alert">
          <div className="max-h-[460px] overflow-y-auto space-y-1.5">
            {alerts.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm border ${
                  selectedId === a.id
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-[#1c2740] hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-mono text-slate-200">{a.entity_id}</span>
                  <SeverityBadge tier={a.tier} />
                </div>
                <div className="text-xs text-slate-500">
                  #{a.id} · {a.attack_type} · risk {a.risk_score.toFixed(1)}
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <div className="lg:col-span-2 space-y-5">
          {explanation ? (
            <>
              <Panel title="Top contributing features (SHAP)">
                <FeatureImpactChart impacts={explanation.feature_impacts} />
                <div className="text-xs text-slate-500 mt-2">
                  Positive impact = increased risk. Negative impact = reduced risk.
                </div>
              </Panel>
              <Panel title="Summary">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Field label="Entity" value={explanation.entity_id} />
                  <Field label="Risk score" value={`${explanation.risk_score}/100`} />
                  <Field label="Severity" value={<SeverityBadge tier={explanation.tier} />} />
                  <Field
                    label="Classifier confidence"
                    value={explanation.model_confidence.toFixed(3)}
                  />
                </div>
                <div className="mt-3 text-sm text-slate-300">{explanation.rationale}</div>
              </Panel>
              <Panel title="Model attention / sequence weighting" right={<ResearchTag />}>
                <p className="text-sm text-slate-400">
                  The MVP's detector is a Gradient Boosted Trees classifier, which does not
                  produce attention weights. Sequence-level attention visualization is planned
                  once the classifier is upgraded to the hybrid CNN-LSTM described in the
                  project documentation.
                </p>
              </Panel>
            </>
          ) : (
            <LoadingState label="Loading explanation..." />
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-slate-100 mt-0.5">{value}</div>
    </div>
  );
}
