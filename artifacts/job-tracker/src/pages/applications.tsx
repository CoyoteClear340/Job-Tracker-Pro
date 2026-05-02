import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  useListApplications,
  useCreateApplication,
  getListApplicationsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { Search, Filter, Plus, AlertTriangle, Building2, MapPin, Globe, Download } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const APPLICATION_STATUSES = ["applied", "interview", "offer", "rejected", "ghosted"] as const;
type ApplicationStatus = typeof APPLICATION_STATUSES[number];

export default function ApplicationsList() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: applications, isLoading } = useListApplications({
    search: debouncedSearch || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/applications/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+?)"/);
      a.download = match?.[1] ?? "term_track_export.csv";
      a.href = url;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Export complete", description: `Downloaded ${a.download}` });
    } catch {
      toast({ title: "Export failed", description: "Could not generate CSV.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">TOTAL_RECORDS: {applications?.length ?? "..."}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="font-mono text-xs h-9 px-3 gap-2"
            onClick={handleExport}
            disabled={exporting || !applications?.length}
          >
            <Download className={`h-3.5 w-3.5 ${exporting ? "animate-bounce" : ""}`} />
            {exporting ? "EXPORTING..." : "EXPORT_CSV"}
          </Button>
          <Link href="/applications/new">
            <Button className="font-mono text-sm">
              <Plus className="h-4 w-4 mr-2" />
              MANUAL_ENTRY
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by company or role..."
            className="pl-9 bg-secondary/50 border-border font-mono text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val as ApplicationStatus | "all")}
          >
            <SelectTrigger className="font-mono text-sm bg-secondary/50">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Filter status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ALL_STATUSES</SelectItem>
              {APPLICATION_STATUSES.map((status) => (
                <SelectItem key={status} value={status} className="uppercase">{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : applications && applications.length > 0 ? (
          applications.map((app) => (
            <Card
              key={app.id}
              className={`hover:border-primary/50 transition-colors cursor-pointer group ${app.isScam ? "border-destructive/50 bg-destructive/5" : ""}`}
              onClick={() => setLocation(`/applications/${app.id}`)}
            >
              <CardContent className="p-5 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg leading-none group-hover:text-primary transition-colors">{app.company}</h3>
                    {app.isScam && (
                      <span className="flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded font-mono border border-destructive/20">
                        <AlertTriangle className="h-3 w-3" /> SCAM_FLAG
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground font-medium">{app.role}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-mono mt-2">
                    {app.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {app.location}
                      </span>
                    )}
                    {app.source && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" /> {app.source}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-foreground/50">
                      APPLIED: {format(new Date(app.appliedAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-3">
                  <StatusBadge status={app.status as ApplicationStatus} className="text-sm px-3 py-1" />
                  <span className="text-xs text-muted-foreground font-mono">
                    UPDATED: {format(new Date(app.updatedAt), "MMM d")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-20 border border-dashed rounded-lg bg-card/50">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-bold mb-1">No applications found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your filters or add a new application.</p>
            <Button onClick={() => setLocation("/applications/new")} className="font-mono">
              <Plus className="h-4 w-4 mr-2" /> CREATE_FIRST_ENTRY
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
