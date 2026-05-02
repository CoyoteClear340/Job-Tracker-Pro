import React, { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useListApplications } from "@workspace/api-client-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Briefcase,
  BellRing,
  ShieldAlert,
  BarChart2,
  Plus,
  Download,
  AlertTriangle,
  Building2,
  ArrowRight,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  applied: "bg-primary/20 text-primary",
  interview: "bg-blue-500/20 text-blue-400",
  offer: "bg-emerald-500/20 text-emerald-400",
  rejected: "bg-destructive/20 text-destructive",
  ghosted: "bg-muted-foreground/20 text-muted-foreground",
};

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, shortcut: "G D" },
  { label: "Applications", href: "/applications", icon: Briefcase, shortcut: "G A" },
  { label: "Analytics", href: "/analytics", icon: BarChart2, shortcut: "G N" },
  { label: "Job Alerts", href: "/alerts", icon: BellRing, shortcut: "G J" },
  { label: "Scam Rules", href: "/scam-detection", icon: ShieldAlert, shortcut: "G S" },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");

  const { data: applications } = useListApplications(
    { search: query || undefined },
    { query: { enabled: open, staleTime: 30000 } }
  );

  const navigate = useCallback(
    (href: string) => {
      setLocation(href);
      onOpenChange(false);
      setQuery("");
    },
    [setLocation, onOpenChange]
  );

  const handleExport = useCallback(async () => {
    onOpenChange(false);
    setQuery("");
    try {
      const res = await fetch("/api/applications/export");
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
    } catch {}
  }, [onOpenChange]);

  // Reset query when closed
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const displayedApps = applications?.slice(0, 8) ?? [];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="border-b border-border/60 bg-card/40">
        <CommandInput
          placeholder="Search applications, navigate pages..."
          value={query}
          onValueChange={setQuery}
          className="font-mono text-sm placeholder:text-muted-foreground/60 h-12"
        />
      </div>
      <CommandList className="max-h-[420px] font-mono">
        <CommandEmpty className="py-8 text-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Building2 className="h-8 w-8 opacity-20" />
            <p className="text-xs uppercase tracking-wider">No results for &ldquo;{query}&rdquo;</p>
          </div>
        </CommandEmpty>

        {/* Navigation */}
        <CommandGroup heading="Navigate">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.href}
              value={`navigate ${item.label}`}
              onSelect={() => navigate(item.href)}
              className="cursor-pointer group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-7 w-7 rounded-md bg-secondary/60 flex items-center justify-center shrink-0 group-data-[selected=true]:bg-primary/10">
                  <item.icon className="h-3.5 w-3.5 text-muted-foreground group-data-[selected=true]:text-primary" />
                </div>
                <span className="text-sm capitalize">{item.label}</span>
              </div>
              <CommandShortcut className="font-mono text-[10px] tracking-wider opacity-50">
                {item.shortcut}
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Quick Actions */}
        <CommandGroup heading="Actions">
          <CommandItem
            value="new application create add"
            onSelect={() => navigate("/applications/new")}
            className="cursor-pointer group"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Plus className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm">New Application</span>
            </div>
            <CommandShortcut className="font-mono text-[10px] tracking-wider opacity-50">⌘ N</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="export csv download spreadsheet"
            onSelect={handleExport}
            className="cursor-pointer group"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="h-7 w-7 rounded-md bg-secondary/60 flex items-center justify-center shrink-0">
                <Download className="h-3.5 w-3.5 text-muted-foreground group-data-[selected=true]:text-primary" />
              </div>
              <span className="text-sm">Export CSV</span>
            </div>
            <CommandShortcut className="font-mono text-[10px] tracking-wider opacity-50">⌘ E</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        {/* Applications */}
        {displayedApps.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={`Applications${query ? ` matching "${query}"` : ""}`}>
              {displayedApps.map((app) => (
                <CommandItem
                  key={app.id}
                  value={`${app.company} ${app.role} ${app.status} ${app.location ?? ""}`}
                  onSelect={() => navigate(`/applications/${app.id}`)}
                  className="cursor-pointer group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-7 w-7 rounded-md bg-secondary/60 flex items-center justify-center shrink-0">
                      {app.isScam ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      ) : (
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground group-data-[selected=true]:text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{app.company}</span>
                        <span
                          className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-mono uppercase font-bold ${STATUS_COLORS[app.status] ?? "bg-muted text-muted-foreground"}`}
                        >
                          {app.status}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground truncate block">{app.role}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0 group-data-[selected=true]:text-primary transition-colors" />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>

      {/* Footer hint */}
      <div className="border-t border-border/60 px-3 py-2 flex items-center gap-4 text-[10px] font-mono text-muted-foreground/50 bg-secondary/20">
        <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-secondary/80 text-[9px]">↑↓</kbd> navigate</span>
        <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-secondary/80 text-[9px]">↵</kbd> select</span>
        <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-secondary/80 text-[9px]">esc</kbd> close</span>
        <span className="ml-auto flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-secondary/80 text-[9px]">⌘K</kbd> toggle</span>
      </div>
    </CommandDialog>
  );
}
