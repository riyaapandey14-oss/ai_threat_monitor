import { useMemo, useState } from "react";
import { SeverityBadge } from "./ui";

export default function AlertTable({ alerts, onSelect }) {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [attackType, setAttackType] = useState("all");
  const [sortKey, setSortKey] = useState("timestamp");
  const [sortDir, setSortDir] = useState("desc");

  const attackTypes = useMemo(
    () => Array.from(new Set(alerts.map((a) => a.attack_type))).sort(),
    [alerts]
  );

  const filtered = useMemo(() => {
    let rows = alerts;
    if (severity !== "all") rows = rows.filter((a) => a.tier === severity);
    if (attackType !== "all") rows = rows.filter((a) => a.attack_type === attackType);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (a) =>
          a.entity_id.toLowerCase().includes(q) ||
          a.attack_type.toLowerCase().includes(q) ||
          String(a.id).includes(q)
      );
    }
    rows = [...rows].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      return a[sortKey] > b[sortKey] ? dir : a[sortKey] < b[sortKey] ? -dir : 0;
    });
    return rows;
  }, [alerts, search, severity, attackType, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search entity, attack type, alert id..."
          className="bg-[#0e1729] border border-[#22304a] rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 flex-1 min-w-[220px]"
        />
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="bg-[#0e1729] border border-[#22304a] rounded-lg px-3 py-1.5 text-sm text-slate-200"
        >
          <option value="all">All severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <select
          value={attackType}
          onChange={(e) => setAttackType(e.target.value)}
          className="bg-[#0e1729] border border-[#22304a] rounded-lg px-3 py-1.5 text-sm text-slate-200"
        >
          <option value="all">All attack types</option>
          {attackTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto max-h-[520px] overflow-y-auto rounded-lg border border-[#22304a]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#131c31]">
            <tr className="text-left text-slate-400 text-xs uppercase tracking-wide">
              <Th label="ID" onClick={() => toggleSort("id")} />
              <Th label="Timestamp" onClick={() => toggleSort("timestamp")} />
              <th className="px-3 py-2">Entity</th>
              <th className="px-3 py-2">Attack Type</th>
              <Th label="Risk" onClick={() => toggleSort("risk_score")} />
              <th className="px-3 py-2">Severity</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Recommended Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.id}
                onClick={() => onSelect && onSelect(a)}
                className="border-t border-[#1c2740] hover:bg-white/[0.03] cursor-pointer"
              >
                <td className="px-3 py-2 text-slate-400">#{a.id}</td>
                <td className="px-3 py-2 text-slate-400">
                  {new Date(a.timestamp * 1000).toLocaleTimeString()}
                </td>
                <td className="px-3 py-2 font-mono text-slate-200">{a.entity_id}</td>
                <td className="px-3 py-2 text-slate-300">{a.attack_type}</td>
                <td className="px-3 py-2 font-bold text-slate-100">{a.risk_score.toFixed(1)}</td>
                <td className="px-3 py-2">
                  <SeverityBadge tier={a.tier} />
                </td>
                <td className="px-3 py-2 text-slate-400">{a.response_status}</td>
                <td className="px-3 py-2 text-slate-300">{a.action.replaceAll("_", " ")}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-slate-500">
                  No alerts match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ label, onClick }) {
  return (
    <th className="px-3 py-2 cursor-pointer select-none" onClick={onClick}>
      {label} ⇅
    </th>
  );
}
