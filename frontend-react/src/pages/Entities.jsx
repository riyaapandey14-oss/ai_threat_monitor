import { useEffect, useState } from "react";
import { Panel, LoadingState, ErrorState, SeverityBadge } from "../components/ui";
import { getEntities, getEntity } from "../services/api";

export default function Entities() {
  const [entities, setEntities] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = () =>
      getEntities()
        .then((d) => {
          setEntities(d);
          setError(false);
        })
        .catch(() => setError(true));
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  const openEntity = (entityId) => {
    getEntity(entityId).then(setSelected);
  };

  if (error) return <ErrorState message="Could not load entities from the backend." />;
  if (!entities) return <LoadingState label="Loading entities..." />;

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-slate-100">Entity Monitoring</h1>

      <Panel title={`Monitored hosts (${entities.length})`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {entities.map((e) => (
            <button
              key={e.entity_id}
              onClick={() => openEntity(e.entity_id)}
              className="text-left bg-[#0e1729] border border-[#22304a] rounded-lg p-3 hover:border-blue-500/50"
            >
              <div className="font-mono text-sm text-slate-100">{e.entity_id}</div>
              <div className="text-xs text-slate-400 mt-1">
                {e.alert_count} alerts · max risk {e.max_risk.toFixed(1)}
              </div>
              <div className="text-xs text-slate-500 mt-1">{e.attack_types.join(", ")}</div>
            </button>
          ))}
        </div>
      </Panel>

      {selected && (
        <Panel title={`Activity history — ${selected.entity_id}`}>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {selected.history.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between bg-[#0e1729] border border-[#1c2740] rounded-lg px-3 py-2 text-sm"
              >
                <span className="text-slate-400 w-32">
                  {new Date(h.timestamp * 1000).toLocaleTimeString()}
                </span>
                <span className="text-slate-300 flex-1">{h.attack_type}</span>
                <span className="font-bold text-slate-100 w-14 text-right">
                  {h.risk_score.toFixed(1)}
                </span>
                <span className="w-20 flex justify-end">
                  <SeverityBadge tier={h.tier} />
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
