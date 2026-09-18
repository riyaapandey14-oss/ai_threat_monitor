import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function FeatureImpactChart({ impacts }) {
  if (!impacts || impacts.length === 0) return null;
  const data = [...impacts].sort((a, b) => a.impact - b.impact);
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 42)}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <CartesianGrid stroke="#22304a" horizontal={false} />
        <XAxis type="number" stroke="#93a1bd" fontSize={11} />
        <YAxis dataKey="feature" type="category" stroke="#93a1bd" fontSize={11} width={140} />
        <Tooltip
          contentStyle={{ background: "#131c31", border: "1px solid #22304a", fontSize: 12 }}
          labelStyle={{ color: "#e6ebf5" }}
        />
        <Bar dataKey="impact" radius={[4, 4, 4, 4]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.impact >= 0 ? "#e74c3c" : "#3b82f6"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
