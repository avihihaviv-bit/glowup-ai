"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tooltipStyle = {
  background: "var(--bg-elev)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--text)",
  fontSize: 12,
  direction: "rtl" as const,
};

export function WeeklyBars({ data, highlightLast = true, unit = "%" }: { data: { label: string; value: number }[]; highlightLast?: boolean; unit?: string }) {
  return (
    <div className="h-44 w-full" dir="ltr">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--text-dim)", fontSize: 11 }} reversed />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--text-dim)", fontSize: 11 }} />
          <Tooltip cursor={{ fill: "var(--surface-2)" }} contentStyle={tooltipStyle} formatter={(v) => [`${v}${unit}`, ""]} separator="" />
          <Bar dataKey="value" radius={[6, 6, 2, 2]} maxBarSize={28}>
            {data.map((_, i) => (
              <Cell key={i} fill={highlightLast && i === data.length - 1 ? "var(--green)" : "var(--accent)"} fillOpacity={highlightLast && i === data.length - 1 ? 1 : 0.75} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendArea({ data, unit = "", color = "var(--accent)" }: { data: { label: string; value: number | null }[]; unit?: string; color?: string }) {
  const id = `grad-${color.replace(/[^a-z]/gi, "")}`;
  return (
    <div className="h-44 w-full" dir="ltr">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--text-dim)", fontSize: 11 }} reversed />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--text-dim)", fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}${unit}`, ""]} separator="" />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${id})`} connectNulls />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
