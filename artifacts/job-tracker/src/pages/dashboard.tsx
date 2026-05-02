import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetApplicationStats,
  useGetRecentActivity,
  useGetGmailSyncStatus,
  useTriggerGmailSync,
  useGetNeedsAttention,
  getGetGmailSyncStatusQueryKey,
  getGetRecentActivityQueryKey,
  getGetApplicationStatsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Activity, Mail, Inbox, TrendingUp, AlertTriangle, Clock, ChevronRight, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/status-badge";
import { format, formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [staleDays, setStaleDays] = useState(7);

  const { data: stats, isLoading: statsLoading } = useGetApplicationStats();
  const { data: recentApps, isLoading: recentLoading } = useGetRecentActivity({ limit: 5 });
  const { data: gmailStatus } = useGetGmailSyncStatus();
  const { data: needsAttention, isLoading: attentionLoading } = useGetNeedsAttention(
    { staleDays },
    { query: { refetchInterval: 60000 } }
  );

  const triggerSync = useTriggerGmailSync({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Sync Complete", description: data.message });
        queryClient.invalidateQueries({ queryKey: getGetGmailSyncStatusQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey({ limit: 5 }) });
        queryClient.invalidateQueries({ queryKey: getGetApplicationStatsQueryKey() });
      },
      onError: () => {
        toast({ title: "Sync Failed", description: "Could not sync with Gmail.", variant: "destructive" });
      }
    }
  });

  const urgencyColor = (days: number) => {
    if (days >= 21) return "text-destructive border-destructive/30 bg-destructive/5";
    if (days >= 14) return "text-yellow-500 border-yellow-500/30 bg-yellow-500/5";
    return "text-muted-foreground border-border bg-card";
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">SYSTEM_STATUS: ONLINE</p>
        </div>

        <div className="flex items-center gap-3 bg-card border border-border p-2 rounded-md shadow-sm">
          <div className="flex items-center gap-2 px-2 border-r border-border">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-mono">
              {gmailStatus?.connected ? "CONNECTED" : "DISCONNECTED"}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs font-mono"
            onClick={() => triggerSync.mutate({ data: {} })}
            disabled={triggerSync.isPending || !gmailStatus?.connected}
          >
            <RefreshCw className={`h-3 w-3 mr-2 ${triggerSync.isPending ? 'animate-spin' : ''}`} />
            SYNC_NOW
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
        ) : stats ? (
          <>
            <Card className="bg-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Active</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono text-primary">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">+{stats.thisMonth} this month</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Response Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono">{stats.responseRate.toFixed(1)}%</div>
                <div className="w-full bg-secondary h-1.5 mt-3 rounded-full overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: `${stats.responseRate}%` }}></div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Interviews</CardTitle>
                <div className="h-4 w-4 rounded-full bg-[#3b82f6]/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-[#3b82f6]"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono">{stats.interview}</div>
                <p className="text-xs text-muted-foreground mt-1">Active pipelines</p>
              </CardContent>
            </Card>

            <Card className={needsAttention && needsAttention.length > 0 ? 'border-yellow-500/30 bg-yellow-500/[0.03]' : 'bg-card'}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Needs Follow-up</CardTitle>
                <Clock className={`h-4 w-4 ${needsAttention && needsAttention.length > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold font-mono ${needsAttention && needsAttention.length > 0 ? 'text-yellow-500' : ''}`}>
                  {attentionLoading ? "..." : (needsAttention?.length ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Stale &gt;{staleDays} days</p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Needs Attention Section */}
      {(attentionLoading || (needsAttention && needsAttention.length > 0)) && (
        <Card className="border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.04)]">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                <Zap className="h-4 w-4 text-yellow-500" />
              </div>
              <div>
                <CardTitle className="font-mono text-sm uppercase text-yellow-500">Needs_Attention</CardTitle>
                <CardDescription>No status update in over {staleDays} days — time to follow up</CardDescription>
              </div>
            </div>
            <Select value={String(staleDays)} onValueChange={(v) => setStaleDays(Number(v))}>
              <SelectTrigger className="h-8 w-28 font-mono text-xs bg-secondary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3" className="font-mono text-xs">3 days</SelectItem>
                <SelectItem value="7" className="font-mono text-xs">7 days</SelectItem>
                <SelectItem value="14" className="font-mono text-xs">14 days</SelectItem>
                <SelectItem value="30" className="font-mono text-xs">30 days</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-0">
            {attentionLoading ? (
              <div className="p-4 space-y-3">
                {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : needsAttention && needsAttention.length > 0 ? (
              <div className="divide-y divide-border">
                {needsAttention.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-secondary/40 cursor-pointer transition-colors group"
                    onClick={() => setLocation(`/applications/${app.id}`)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`shrink-0 text-center min-w-[52px] px-2 py-1.5 rounded-md border font-mono text-xs font-bold ${urgencyColor(app.daysSinceUpdate)}`}>
                        <div className="text-base leading-none">{app.daysSinceUpdate}</div>
                        <div className="text-[9px] opacity-70 mt-0.5">DAYS</div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground truncate group-hover:text-primary transition-colors">{app.company}</span>
                          {app.isScam && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                        </div>
                        <span className="text-sm text-muted-foreground truncate block">{app.role}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <div className="text-right hidden sm:block">
                        <StatusBadge status={app.status as "applied" | "interview" | "offer" | "rejected" | "ghosted"} />
                        <p className="text-[10px] text-muted-foreground font-mono mt-1">
                          {formatDistanceToNow(new Date(app.updatedAt), { addSuffix: true })}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
            <div>
              <CardTitle className="font-mono text-sm uppercase">Recent_Activity</CardTitle>
              <CardDescription>Latest updates to your applications</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="font-mono text-xs" onClick={() => setLocation('/applications')}>
              VIEW_ALL
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentLoading ? (
              <div className="p-6 space-y-4">
                {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : recentApps && recentApps.length > 0 ? (
              <div className="divide-y divide-border">
                {recentApps.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 flex items-center justify-between hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/applications/${app.id}`)}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{app.company}</span>
                        {app.isScam && <AlertTriangle className="h-3 w-3 text-destructive" />}
                      </div>
                      <span className="text-sm text-muted-foreground">{app.role}</span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={app.status as "applied" | "interview" | "offer" | "rejected" | "ghosted"} />
                      <span className="text-xs text-muted-foreground font-mono">
                        {format(new Date(app.updatedAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center">
                <Inbox className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No recent activity found.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Status */}
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="font-mono text-sm uppercase">Pipeline_Status</CardTitle>
            <CardDescription>Distribution of active applications</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {statsLoading ? (
              <div className="space-y-4"><Skeleton className="h-40 w-full" /></div>
            ) : stats ? (
              <div className="space-y-5">
                {[
                  { label: "Applied", value: stats.applied, color: "bg-primary" },
                  { label: "Interviewing", value: stats.interview, color: "bg-[#3b82f6]" },
                  { label: "Offers", value: stats.offer, color: "bg-[#10b981]" },
                  { label: "Ghosted", value: stats.ghosted, color: "bg-muted-foreground" },
                  { label: "Rejected", value: stats.rejected, color: "bg-destructive" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-mono font-medium">{value}</span>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div
                        className={`${color} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${(value / Math.max(stats.total, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
