export function SeverityBadge({ tier }) {
  const styles = {
    low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    high: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${
        styles[tier] || "bg-slate-500/15 text-slate-300 border-slate-500/30"
      }`}
    >
      {tier}
    </span>
  );
}

export function StatCard({ label, value, accent }) {
  const accentClass =
    { low: "text-emerald-400", medium: "text-amber-400", high: "text-red-400" }[accent] ||
    "text-slate-100";
  return (
    <div className="bg-[#131c31] border border-[#22304a] rounded-xl p-4">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accentClass}`}>{value}</div>
    </div>
  );
}

export function Panel({ title, children, right }) {
  return (
    <div className="bg-[#131c31] border border-[#22304a] rounded-xl p-4">
      {(title || right) && (
        <div className="flex items-center justify-between mb-3">
          {title && (
            <h2 className="text-xs uppercase tracking-wide text-slate-400 font-semibold">
              {title}
            </h2>
          )}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function LoadingState({ label = "Loading..." }) {
  return <div className="text-slate-400 text-sm py-8 text-center">{label}</div>;
}

export function EmptyState({ label = "No data yet." }) {
  return <div className="text-slate-500 text-sm py-8 text-center">{label}</div>;
}

export function ErrorState({ message = "Something went wrong." }) {
  return (
    <div className="text-red-400 text-sm py-8 text-center border border-red-500/30 rounded-lg bg-red-500/5">
      {message}
    </div>
  );
}

export function ResearchTag() {
  return (
    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
      Planned / Research Extension
    </span>
  );
}
