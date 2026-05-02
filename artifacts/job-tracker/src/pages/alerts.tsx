import React, { useState } from "react";
import {
  useListAlerts,
  useCreateAlert,
  useDeleteAlert,
  useGetEmailConfig,
  useSendTestEmail,
  useSendReminderDigest,
  useGetReminderDigestPreview,
  getListAlertsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BellRing, Trash2, Search, Briefcase, MapPin, Mail, CheckCircle2, Info, Send, Bell, Clock, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function JobAlerts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [keyword, setKeyword] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [testEmail, setTestEmail] = useState("");

  const { data: alerts, isLoading } = useListAlerts();
  const { data: emailConfig } = useGetEmailConfig();

  const createAlert = useCreateAlert({
    mutation: {
      onSuccess: () => {
        toast({ title: "Alert created successfully" });
        setKeyword("");
        setCompany("");
        setLocation("");
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
      }
    }
  });

  const deleteAlert = useDeleteAlert({
    mutation: {
      onSuccess: () => {
        toast({ title: "Alert removed" });
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
      }
    }
  });

  const sendTest = useSendTestEmail({
    mutation: {
      onSuccess: (data) => {
        if (data.success) {
          toast({ title: "Test email sent!", description: data.message });
        } else {
          toast({ title: "Email not sent", description: data.message, variant: "destructive" });
        }
      }
    }
  });

  const { data: digestPreview } = useGetReminderDigestPreview({ query: { refetchInterval: 30000 } });

  const sendDigest = useSendReminderDigest({
    mutation: {
      onSuccess: (data) => {
        if (data.sent) {
          toast({ title: "Digest sent!", description: `${data.reminderCount} reminder${data.reminderCount !== 1 ? "s" : ""} included.` });
        } else if (data.reminderCount === 0) {
          toast({ title: "Nothing to send", description: "No pending reminders due today or tomorrow." });
        } else {
          toast({ title: "Digest failed", description: data.error ?? "Could not send email.", variant: "destructive" });
        }
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword) return;
    createAlert.mutate({ data: { keyword, company: company || undefined, location: location || undefined } });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Job Alerts</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">BACKGROUND_MONITORING: ACTIVE</p>
      </div>

      {/* Email Config Status Banner */}
      <div className={`flex items-start gap-3 p-4 rounded-lg border text-sm font-mono ${emailConfig?.configured ? 'border-primary/30 bg-primary/5 text-primary' : 'border-border bg-secondary/30 text-muted-foreground'}`}>
        {emailConfig?.configured ? (
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
        ) : (
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
        )}
        <div className="flex-1">
          {emailConfig?.configured ? (
            <span>EMAIL_ALERTS: <span className="text-primary font-bold">ACTIVE</span> — notifications sending via {emailConfig.smtpHost}</span>
          ) : (
            <span>EMAIL_ALERTS: <span className="font-bold text-foreground/60">INACTIVE</span> — set <code className="bg-secondary px-1 rounded text-xs">SMTP_HOST</code>, <code className="bg-secondary px-1 rounded text-xs">SMTP_USER</code>, <code className="bg-secondary px-1 rounded text-xs">SMTP_PASS</code>, and <code className="bg-secondary px-1 rounded text-xs">NOTIFY_EMAIL</code> in Secrets to enable email alerts</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.05)]">
            <CardHeader>
              <CardTitle className="font-mono text-sm uppercase flex items-center gap-2">
                <BellRing className="h-4 w-4 text-primary" /> NEW_MONITOR
              </CardTitle>
              <CardDescription>Track specific roles or companies.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono font-medium">KEYWORD *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      required
                      value={keyword}
                      onChange={e => setKeyword(e.target.value)}
                      placeholder="e.g. Frontend Engineer"
                      className="pl-9 font-mono text-sm bg-secondary/50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono font-medium">COMPANY (OPTIONAL)</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      placeholder="e.g. Stripe"
                      className="pl-9 font-mono text-sm bg-secondary/50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono font-medium">LOCATION (OPTIONAL)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="e.g. Remote, NYC"
                      className="pl-9 font-mono text-sm bg-secondary/50"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full font-mono mt-2" disabled={createAlert.isPending || !keyword}>
                  {createAlert.isPending ? "INITIALIZING..." : "START_MONITORING"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Email Test Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-mono text-sm uppercase flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" /> TEST_EMAIL
              </CardTitle>
              <CardDescription className="text-xs">Send a test notification to verify your SMTP setup.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="you@example.com"
                className="font-mono text-sm bg-secondary/50"
              />
              <Button
                variant="outline"
                className="w-full font-mono text-xs"
                disabled={sendTest.isPending || !testEmail || !emailConfig?.configured}
                onClick={() => sendTest.mutate({ data: { to: testEmail } })}
              >
                <Send className="h-3.5 w-3.5 mr-2" />
                {!emailConfig?.configured ? "SMTP_NOT_CONFIGURED" : sendTest.isPending ? "SENDING..." : "SEND_TEST"}
              </Button>
            </CardContent>
          </Card>

          {/* Reminder Digest Card */}
          <Card className="border-primary/20 shadow-[0_0_12px_rgba(var(--primary),0.06)]">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="font-mono text-sm uppercase flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" /> REMINDER_DIGEST
              </CardTitle>
              <CardDescription className="text-xs">Daily email at 08:00 with all pending follow-ups.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Schedule info */}
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-secondary/40 rounded-md px-3 py-2">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>Scheduled: <span className="text-foreground font-bold">08:00 daily</span></span>
              </div>

              {/* Live stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border border-border bg-card p-3 text-center">
                  <div className="text-2xl font-bold font-mono text-primary">
                    {digestPreview?.pendingCount ?? "—"}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-0.5">PENDING</div>
                </div>
                <div className={`rounded-md border p-3 text-center ${(digestPreview?.overdueCount ?? 0) > 0 ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"}`}>
                  <div className={`text-2xl font-bold font-mono ${(digestPreview?.overdueCount ?? 0) > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {digestPreview?.overdueCount ?? "—"}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                    {(digestPreview?.overdueCount ?? 0) > 0 && <AlertTriangle className="h-2.5 w-2.5 text-destructive" />}
                    OVERDUE
                  </div>
                </div>
              </div>

              {/* Notify email display */}
              {digestPreview?.notifyEmail && (
                <div className="text-xs font-mono text-muted-foreground bg-secondary/30 rounded px-2 py-1.5 flex items-center gap-2">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{digestPreview.notifyEmail}</span>
                </div>
              )}

              {/* Send now button */}
              <Button
                className="w-full font-mono text-xs"
                disabled={sendDigest.isPending || !emailConfig?.configured}
                onClick={() => sendDigest.mutate({})}
              >
                <Send className="h-3.5 w-3.5 mr-2" />
                {!emailConfig?.configured
                  ? "SMTP_NOT_CONFIGURED"
                  : sendDigest.isPending
                  ? "SENDING_DIGEST..."
                  : `SEND_NOW${digestPreview?.pendingCount ? ` (${digestPreview.pendingCount})` : ""}`}
              </Button>

              {!emailConfig?.configured && (
                <p className="text-[11px] text-muted-foreground text-center font-mono leading-relaxed">
                  Set SMTP_HOST, SMTP_USER, SMTP_PASS, and NOTIFY_EMAIL in Secrets to enable
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-mono text-sm uppercase text-muted-foreground px-1">ACTIVE_MONITORS [{alerts?.length || 0}]</h3>

          {isLoading ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          ) : alerts && alerts.length > 0 ? (
            <div className="grid gap-3">
              {alerts.map((alert) => (
                <Card key={alert.id} className="bg-card hover:bg-secondary/30 transition-colors border-border/60">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg leading-none">{alert.keyword}</span>
                        {alert.active && (
                          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_5px_var(--color-primary)]"></span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                        {alert.company && <span>CO: {alert.company}</span>}
                        {alert.location && <span>LOC: {alert.location}</span>}
                        <span>CREATED: {format(new Date(alert.createdAt), 'MM/dd/yy')}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteAlert.mutate({ id: alert.id })}
                      disabled={deleteAlert.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed border-border/50 rounded-lg bg-card/20">
              <BellRing className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
              <p className="text-muted-foreground font-mono text-sm">NO_ACTIVE_MONITORS</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
