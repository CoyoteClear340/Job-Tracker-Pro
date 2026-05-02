import React, { useState } from "react";
import { useGetAnalytics } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { TrendingUp, BarChart2, PieChart as PieIcon, Target } from "lucide-react";
import { format, parse } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  applied: "#22c55e",
  interview: "#3b82f6",
  offer: "#10b981",
  rejected: "#ef4444",
  ghosted: "#6b7280",
};

const PIE_COLORS = ["#22c55e", "#3b82f6", "#10b981", "#ef4444", "#6b7280"];

function ChartTooltipStyle({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs font-mono">
      {label && <p className="text-muted-foreground mb-2">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-bold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color = "text-foreground" }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; color?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold font-mono ${color}`}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { data, isLoading } = useGetAnalytics();

  const pieData = data
    ? Object.entries(data.statusTotals)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  const monthLabels = data?.byMonth.map((b) => {
    try { return format(parse(b.month, "yyyy-MM", new Date()), "MMM yy"); }
    catch { return b.month; }
  }) ?? [];

  const byMonthWithLabel = data?.byMonth.map((b, i) => ({ ...b, label: monthLabels[i] })) ?? [];

  const sourceData = data?.bySource.map((b) => ({
    ...b,
    responseRate: b.count > 0 ? Math.round((b.responseCount / b.count) * 100) : 0,
  })) ?? [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">SIGNAL_ANALYSIS: ACTIVE</p>
      </div>

      {/* Top KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
        ) : data ? (
          <>
            <StatCard label="Total Applications" value={data.totalApplications} sub="All time" icon={BarChart2} color="text-primary" />
            <StatCard label="Response Rate" value={`${data.overallResponseRate}%`} sub="Interview + Offer" icon={TrendingUp} />
            <StatCard label="Offers Received" value={data.statusTotals.offer} sub={`${data.totalApplications > 0 ? Math.round((data.statusTotals.offer / data.totalApplications) * 100) : 0}% conversion`} icon={Target} color="text-emerald-500" />
            <StatCard label="Active Pipelines" value={data.statusTotals.interview} sub="In interview stage" icon={PieIcon} color="text-blue-500" />
          </>
        ) : null}
      </div>

      {/* Applications over time */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="font-mono text-sm uppercase">Application_Volume_Over_Time</CardTitle>
          <CardDescription>Monthly application breakdown by final status</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : byMonthWithLabel.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={byMonthWithLabel} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                <defs>
                  {Object.entries(STATUS_COLORS).map(([key, color]) => (
                    <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontFamily: "monospace" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltipStyle />} />
                <Legend formatter={(v) => <span style={{ fontFamily: "monospace", fontSize: 11, color: "hsl(var(--muted-foreground))", textTransform: "capitalize" }}>{v}</span>} />
                {(["applied", "interview", "offer", "rejected", "ghosted"] as const).map((s) => (
                  <Area key={s} type="monotone" dataKey={s} name={s} stroke={STATUS_COLORS[s]} fill={`url(#grad-${s})`} strokeWidth={2} dot={false} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground font-mono text-sm">NO_DATA_AVAILABLE</div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status breakdown pie */}
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="font-mono text-sm uppercase">Status_Distribution</CardTitle>
            <CardDescription>Breakdown of all applications by current status</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : pieData.length > 0 ? (
              <div className="flex flex-col items-center gap-4">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} strokeWidth={0}>
                      {pieData.map((entry, i) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltipStyle />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
                  {pieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-xs font-mono">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: STATUS_COLORS[entry.name] }} />
                      <span className="text-muted-foreground capitalize">{entry.name}</span>
                      <span className="font-bold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-muted-foreground font-mono text-sm">NO_DATA_AVAILABLE</div>
            )}
          </CardContent>
        </Card>

        {/* Applications by source */}
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="font-mono text-sm uppercase">Applications_By_Source</CardTitle>
            <CardDescription>Volume and response rate per application channel</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sourceData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontFamily: "monospace" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="source" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontFamily: "monospace" }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip content={<ChartTooltipStyle />} />
                  <Legend formatter={(v) => <span style={{ fontFamily: "monospace", fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{v}</span>} />
                  <Bar dataKey="count" name="Total" fill="#22c55e" radius={[0, 3, 3, 0]} maxBarSize={18} />
                  <Bar dataKey="responseCount" name="Responses" fill="#3b82f6" radius={[0, 3, 3, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-56 flex items-center justify-center text-muted-foreground font-mono text-sm">NO_DATA_AVAILABLE</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Response rate per source table */}
      {!isLoading && sourceData.length > 0 && (
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="font-mono text-sm uppercase">Source_Performance_Table</CardTitle>
            <CardDescription>Detailed stats per channel, sorted by volume</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <div className="grid grid-cols-4 px-5 py-2.5 text-xs font-mono text-muted-foreground uppercase tracking-wider bg-secondary/30">
                <span>Source</span>
                <span className="text-right">Applications</span>
                <span className="text-right">Responses</span>
                <span className="text-right">Rate</span>
              </div>
              {sourceData.map((s) => (
                <div key={s.source} className="grid grid-cols-4 px-5 py-3 text-sm font-mono hover:bg-secondary/30 transition-colors">
                  <span className="text-foreground font-medium truncate pr-2">{s.source}</span>
                  <span className="text-right text-muted-foreground">{s.count}</span>
                  <span className="text-right text-muted-foreground">{s.responseCount}</span>
                  <span className={`text-right font-bold ${s.responseRate >= 30 ? "text-emerald-500" : s.responseRate >= 10 ? "text-yellow-500" : "text-muted-foreground"}`}>
                    {s.responseRate}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
