import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", icon: "🛡️" },
  { to: "/live", label: "Live Monitoring", icon: "📡" },
  { to: "/alerts", label: "Alerts", icon: "🚨" },
  { to: "/entities", label: "Entities", icon: "🖥️" },
  { to: "/analytics", label: "Threat Analytics", icon: "📊" },
  { to: "/explainability", label: "Explainable AI", icon: "🧠" },
  { to: "/response", label: "Response Center", icon: "🧯" },
  { to: "/performance", label: "Model Performance", icon: "📈" },
  { to: "/research", label: "Research & Innovation", icon: "🔬" },
  { to: "/about", label: "Settings / About", icon: "⚙️" },
];

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 bg-[#0e1729] border-r border-[#22304a] h-screen sticky top-0 flex flex-col">
      <div className="px-5 py-5 border-b border-[#22304a]">
        <div className="text-sm font-bold tracking-wide text-slate-100">AI THREAT MONITOR</div>
        <div className="text-[11px] text-slate-500 mt-0.5">SOC Dashboard</div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-2.5 text-sm font-medium border-l-2 ${
                isActive
                  ? "border-blue-500 text-slate-100 bg-blue-500/10"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
              }`
            }
          >
            <span>{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-[#22304a] text-[11px] text-slate-500">
        Synthetic-data MVP demo. See Research &amp; Innovation for scope.
      </div>
    </aside>
  );
}
