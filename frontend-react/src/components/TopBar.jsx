import { useEffect, useState } from "react";
import { getHealth } from "../services/api";

export default function TopBar({ streaming }) {
  const [health, setHealth] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const poll = () => {
      getHealth()
        .then((d) => {
          if (!mounted) return;
          setHealth(d);
          setLastUpdate(new Date());
          setError(false);
        })
        .catch(() => mounted && setError(true));
    };
    poll();
    const id = setInterval(poll, 8000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const online = !error && health?.status === "ok";

  return (
    <div className="h-14 border-b border-[#22304a] bg-[#0e1729]/80 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <div className="text-sm font-semibold text-slate-100">
          Real-Time AI-Based Anomaly Detection &amp; Threat Monitoring
        </div>
      </div>
      <div className="flex items-center gap-5 text-xs text-slate-400">
        <StatusDot ok={online} label={online ? "System ONLINE" : "System OFFLINE"} />
        <StatusDot
          ok={!!health?.ready}
          label={health?.ready ? "Detection engine ready" : "Detection engine training..."}
        />
        <StatusDot ok={streaming} label={streaming ? "Streaming: active" : "Streaming: idle"} />
        <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

function StatusDot({ ok, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${ok ? "bg-emerald-400" : "bg-slate-600"}`} />
      {label}
    </span>
  );
}
