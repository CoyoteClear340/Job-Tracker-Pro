import React, { useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import {
  useListApplications,
  useBulkUpdateApplications,
  useUpdateApplication,
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
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/status-badge";
import {
  Search,
  Filter,
  Plus,
  AlertTriangle,
  MapPin,
  Globe,
  Download,
  Building2,
  Trash2,
  ShieldAlert,
  CheckSquare,
  X,
  LayoutList,
  Columns,
} from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const APPLICATION_STATUSES = ["applied", "interview", "offer", "rejected", "ghosted"] as const;
type ApplicationStatus = typeof APPLICATION_STATUSES[number];

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; glow: string; dot: string }> = {
  applied:   { label: "APPLIED",    color: "border-blue-500/30 bg-blue-500/5",   glow: "shadow-[0_0_12px_rgba(59,130,246,0.12)]",  dot: "bg-blue-400" },
  interview: { label: "INTERVIEW",  color: "border-yellow-500/30 bg-yellow-500/5", glow: "shadow-[0_0_12px_rgba(234,179,8,0.12)]", dot: "bg-yellow-400" },
  offer:     { label: "OFFER",      color: "border-green-500/30 bg-green-500/5",  glow: "shadow-[0_0_12px_rgba(34,197,94,0.12)]",  dot: "bg-green-400" },
  rejected:  { label: "REJECTED",   color: "border-red-500/30 bg-red-500/5",     glow: "shadow-[0_0_12px_rgba(239,68,68,0.12)]",  dot: "bg-red-400" },
  ghosted:   { label: "GHOSTED",    color: "border-zinc-500/30 bg-zinc-500/5",   glow: "shadow-[0_0_12px_rgba(113,113,122,0.12)]", dot: "bg-zinc-500" },
};

type Application = {
  id: number;
  company: string;
  role: string;
  status: string;
  appliedAt: string;
  location?: string | null;
  source?: string | null;
  isScam?: boolean | null;
};

function KanbanCard({
  app,
  onDragStart,
}: {
  app: Application;
  onDragStart: (id: number) => void;
}) {
  const [, setLocation] = useLocation();
  return (
    <div
      draggable
      onDragStart={() => onDragStart(app.id)}
      onClick={() => setLocation(`/applications/${app.id}`)}
      className={`group cursor-pointer rounded-lg border p-3 text-sm transition-all duration-150 hover:border-primary/50 active:opacity-60 active:scale-95 select-none ${
        app.isScam
          ? "border-destructive/40 bg-destructive/5"
          : "border-border/60 bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-bold leading-tight group-hover:text-primary transition-colors line-clamp-1">
          {app.company}
        </span>
        {app.isScam && (
          <AlertTriangle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
        )}
      </div>
      <p className="text-muted-foreground text-xs truncate mb-2">{app.role}</p>
      <div className="flex flex-wrap gap-2 text-[10px] font-mono text-muted-foreground">
        {app.location && (
          <span className="flex items-center gap-0.5">
            <MapPin className="h-2.5 w-2.5" />
            {app.location}
          </span>
        )}
        <span className="ml-auto text-foreground/40">
          {format(new Date(app.appliedAt), "MMM d")}
        </span>
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  apps,
  onDragStart,
  onDrop,
  isDragOver,
  onDragOver,
  onDragLeave,
}: {
  status: ApplicationStatus;
  apps: Application[];
  onDragStart: (id: number) => void;
  onDrop: (status: ApplicationStatus) => void;
  isDragOver: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div
      className={`flex flex-col min-h-[200px] rounded-xl border transition-all duration-150 ${cfg.color} ${
        isDragOver ? `${cfg.glow} border-opacity-80 scale-[1.01]` : ""
      }`}
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(status); }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
          <span className="text-xs font-mono font-bold tracking-wider">{cfg.label}</span>
        </div>
        <span className="text-xs font-mono text-muted-foreground bg-secondary/60 rounded px-1.5 py-0.5">
          {apps.length}
        </span>
      </div>

      {/* Drop zone + cards */}
      <div className={`flex-1 flex flex-col gap-2 p-2 min-h-[80px] transition-colors ${isDragOver ? "bg-primary/5 rounded-b-xl" : ""}`}>
        {apps.length === 0 && !isDragOver && (
          <div className="flex-1 flex items-center justify-center text-[11px] font-mono text-muted-foreground/40 py-6">
            DROP_HERE
          </div>
        )}
        {apps.map((app) => (
          <KanbanCard key={app.id} app={app} onDragStart={onDragStart} />
        ))}
        {isDragOver && (
          <div className="border-2 border-dashed border-primary/40 rounded-lg h-16 flex items-center justify-center text-[11px] font-mono text-primary/60">
            MOVE_HERE
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanBoard({ search }: { search: string }) {
  const { data: applications, isLoading } = useListApplications({ search: search || undefined });
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<ApplicationStatus | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const update = useUpdateApplication({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
      },
      onError: () => {
        toast({ title: "Move failed", description: "Could not update status.", variant: "destructive" });
      },
    },
  });

  const handleDrop = (toStatus: ApplicationStatus) => {
    if (dragId === null) return;
    const app = applications?.find((a) => a.id === dragId);
    if (!app || app.status === toStatus) { setDragId(null); setDragOver(null); return; }
    update.mutate({ id: dragId, data: { status: toStatus } });
    toast({ title: `Moved to ${toStatus.toUpperCase()}`, description: `${app.company} — ${app.role}` });
    setDragId(null);
    setDragOver(null);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {APPLICATION_STATUSES.map((s) => (
          <Skeleton key={s} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const byStatus = APPLICATION_STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: applications?.filter((a) => a.status === s) ?? [] }),
    {} as Record<ApplicationStatus, Application[]>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      {APPLICATION_STATUSES.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          apps={byStatus[status]}
          onDragStart={(id) => setDragId(id)}
          onDrop={handleDrop}
          isDragOver={dragOver === status}
          onDragOver={() => setDragOver(status)}
          onDragLeave={() => setDragOver((prev) => (prev === status ? null : prev))}
        />
      ))}
    </div>
  );
}

type ViewMode = "list" | "kanban";

export default function ApplicationsList() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStatusPicker, setBulkStatusPicker] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: applications, isLoading } = useListApplications({
    search: debouncedSearch || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const bulk = useBulkUpdateApplications({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
        setSelected(new Set());
        setBulkStatusPicker(false);
        const msgs: Record<string, string> = {
          updateStatus: `Updated ${data.affected} application${data.affected !== 1 ? "s" : ""}`,
          markScam: `Flagged ${data.affected} application${data.affected !== 1 ? "s" : ""} as scam`,
          delete: `Deleted ${data.affected} application${data.affected !== 1 ? "s" : ""}`,
        };
        toast({ title: "Bulk action complete", description: msgs[data.action ?? ""] ?? "" });
      },
      onError: () => {
        toast({ title: "Action failed", description: "Could not complete bulk action.", variant: "destructive" });
      },
    },
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

  const allIds = applications?.map((a) => a.id) ?? [];
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const toggleOne = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const doBulk = (action: "updateStatus" | "markScam" | "delete", status?: string) => {
    bulk.mutate({ data: { ids: Array.from(selected), action, status: status ?? null } });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            TOTAL_RECORDS: {applications?.length ?? "..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-secondary/50 border border-border rounded-lg p-0.5 gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-2.5 gap-1.5 font-mono text-xs rounded-md ${view === "list" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground"}`}
              onClick={() => setView("list")}
            >
              <LayoutList className="h-3.5 w-3.5" />
              LIST
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-2.5 gap-1.5 font-mono text-xs rounded-md ${view === "kanban" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground"}`}
              onClick={() => { setView("kanban"); setSelected(new Set()); }}
            >
              <Columns className="h-3.5 w-3.5" />
              KANBAN
            </Button>
          </div>

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

      {/* Filter bar — hidden in kanban's per-column filtering, show simplified search */}
      <div className={`flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg border border-border`}>
        {view === "list" && (
          <div className="flex items-center gap-3 shrink-0">
            <Checkbox
              id="select-all"
              checked={allSelected}
              onCheckedChange={toggleAll}
              disabled={isLoading || allIds.length === 0}
              className="border-muted-foreground data-[state=checked]:bg-primary"
            />
            <label htmlFor="select-all" className="text-xs font-mono text-muted-foreground cursor-pointer select-none whitespace-nowrap">
              {someSelected ? `${selected.size} SELECTED` : "SELECT_ALL"}
            </label>
          </div>
        )}

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={view === "kanban" ? "Search across all columns..." : "Search by company or role..."}
            className="pl-9 bg-secondary/50 border-border font-mono text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {view === "list" && (
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
        )}
      </div>

      {/* Kanban view */}
      {view === "kanban" && (
        <KanbanBoard search={debouncedSearch} />
      )}

      {/* List view */}
      {view === "list" && (
        <div className="space-y-3">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : applications && applications.length > 0 ? (
            applications.map((app) => (
              <Card
                key={app.id}
                className={`transition-colors cursor-pointer group ${
                  selected.has(app.id)
                    ? "border-primary/70 bg-primary/5"
                    : app.isScam
                    ? "border-destructive/50 bg-destructive/5 hover:border-destructive/70"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setLocation(`/applications/${app.id}`)}
              >
                <CardContent className="p-5 flex gap-4 items-center">
                  <div
                    className="shrink-0 flex items-center"
                    onClick={(e) => toggleOne(app.id, e)}
                  >
                    <Checkbox
                      checked={selected.has(app.id)}
                      onCheckedChange={() => {}}
                      className="border-muted-foreground data-[state=checked]:bg-primary pointer-events-none"
                    />
                  </div>

                  <div className="flex-1 flex flex-col sm:flex-row gap-4 justify-between sm:items-center min-w-0">
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg leading-none group-hover:text-primary transition-colors">{app.company}</h3>
                        {app.isScam && (
                          <span className="flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded font-mono border border-destructive/20">
                            <AlertTriangle className="h-3 w-3" /> SCAM_FLAG
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground font-medium truncate">{app.role}</p>
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
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
                      <StatusBadge status={app.status as ApplicationStatus} className="text-sm px-3 py-1" />
                      <span className="text-xs text-muted-foreground font-mono">
                        UPDATED: {format(new Date(app.updatedAt), "MMM d")}
                      </span>
                    </div>
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
      )}

      {/* Floating bulk action bar (list mode only) */}
      {someSelected && view === "list" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-card border border-primary/40 rounded-xl px-4 py-3 shadow-[0_0_30px_rgba(var(--primary),0.25)] animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 mr-2 border-r border-border pr-3">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="font-mono text-sm font-bold text-primary">{selected.size}</span>
            <span className="font-mono text-xs text-muted-foreground">SELECTED</span>
          </div>

          {bulkStatusPicker ? (
            <div className="flex items-center gap-1">
              {APPLICATION_STATUSES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="outline"
                  className="font-mono text-xs h-7 px-2 uppercase"
                  onClick={() => doBulk("updateStatus", s)}
                  disabled={bulk.isPending}
                >
                  {s}
                </Button>
              ))}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setBulkStatusPicker(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="font-mono text-xs h-8 gap-1.5"
                onClick={() => setBulkStatusPicker(true)}
                disabled={bulk.isPending}
              >
                <Filter className="h-3.5 w-3.5" />
                SET_STATUS
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="font-mono text-xs h-8 gap-1.5 border-yellow-500/40 text-yellow-500 hover:bg-yellow-500/10"
                onClick={() => doBulk("markScam")}
                disabled={bulk.isPending}
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                MARK_SCAM
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="font-mono text-xs h-8 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => doBulk("delete")}
                disabled={bulk.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                DELETE
              </Button>
            </>
          )}

          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 ml-1 text-muted-foreground"
            onClick={() => { setSelected(new Set()); setBulkStatusPicker(false); }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
