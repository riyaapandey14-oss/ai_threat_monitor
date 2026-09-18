import { useCallback, useEffect, useRef, useState } from "react";
import { Panel, StatCard, SeverityBadge } from "../components/ui";
import { useLiveAlertStream } from "../hooks/useLiveAlertStream";

export default function LiveMonitoring({ onStreamingChange }) {
  const [events, setEvents] = useState([]);
  const [counts, setCounts] = useState({ low: 0, medium: 0, high: 0 });
  const totalRef = useRef(0);
  const [total, setTotal] = useState(0);

  const onEvent = useCallback((record) => {
    setEvents((prev) => [record, ...prev].slice(0, 40));
    setCounts((prev) => ({ ...prev, [record.tier]: prev[record.tier] + 1 }));
    totalRef.current += 1;
    setTotal(totalRef.current);
  }, []);

  const { connected, start, stop } = useLiveAlertStream(onEvent);

  useEffect(() => {
    onStreamingChange && onStreamingChange(connected);
  }, [connected, onStreamingChange]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-100">Live Monitoring</h1>
        <div className="flex gap-2">
          <button
            onClick={start}
            disabled={connected}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            ▶ Start Monitoring
          </button>
          <button
            onClick={stop}
            disabled={!connected}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            ■ Stop Monitoring
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Stream status" value={connected ? "LIVE" : "Idle"} accent={connected ? "low" : undefined} />
        <StatCard label="Events (this session)" value={total} />
        <StatCard label="Medium/High flagged" value={counts.medium + counts.high} accent="medium" />
        <StatCard label="High risk" value={counts.high} accent="high" />
      </div>

      <Panel title="Live feed (most recent first)">
        <div className="max-h-[480px] overflow-y-auto space-y-2">
          {events.length === 0 && (
            <div className="text-slate-500 text-sm text-center py-10">
              Click "Start Monitoring" to begin streaming synthetic events through the live
              detection pipeline via WebSocket.
            </div>
          )}
          {events.map((e, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-[#0e1729] border border-[#1c2740] rounded-lg px-3 py-2 text-sm"
            >
              <span className="font-mono text-slate-300 w-24">{e.entity_id}</span>
              <span className="text-slate-400 flex-1 truncate px-3">{e.attack_type}</span>
              <span className="font-bold text-slate-100 w-16 text-right">
                {e.risk_score.toFixed(1)}
              </span>
              <span className="w-20 flex justify-end">
                <SeverityBadge tier={e.tier} />
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
