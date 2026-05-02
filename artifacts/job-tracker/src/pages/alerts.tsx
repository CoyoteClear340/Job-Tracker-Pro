import React, { useState } from "react";
import { 
  useListAlerts,
  useCreateAlert,
  useDeleteAlert,
  getListAlertsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BellRing, Plus, Trash2, Search, Briefcase, MapPin } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function JobAlerts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [keyword, setKeyword] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");

  const { data: alerts, isLoading } = useListAlerts();

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
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