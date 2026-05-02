import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Briefcase, BellRing, ShieldAlert, Search, Plus, ActivitySquare, Bell, X, Check, CheckCheck, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHealthCheck, useListNotifications, useMarkNotificationRead, useClearNotifications, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { CommandPalette } from "@/components/command-palette";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: health } = useHealthCheck();
  const [notifOpen, setNotifOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const { data: notifications } = useListNotifications({ unreadOnly: false }, {
    query: { refetchInterval: 30000 }
  });
  const unread = notifications?.filter(n => !n.read) ?? [];

  const markRead = useMarkNotificationRead({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() })
    }
  });

  const clearAll = useClearNotifications({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() })
    }
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Applications", href: "/applications", icon: Briefcase },
    { name: "Analytics", href: "/analytics", icon: BarChart2 },
    { name: "Job Alerts", href: "/alerts", icon: BellRing, badge: unread.length },
    { name: "Scam Rules", href: "/scam-detection", icon: ShieldAlert },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary selection:text-primary-foreground dark text-foreground">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col justify-between hidden md:flex shrink-0">
        <div>
          <div className="h-16 flex items-center px-6 border-b border-border">
            <Link href="/" className="flex items-center gap-2 font-mono font-bold tracking-tight text-primary">
              <div className="w-4 h-4 bg-primary rounded-sm shadow-[0_0_10px_var(--color-primary)]"></div>
              TERM_TRACK
            </Link>
          </div>

          <nav className="p-4 space-y-1">
            <div className="mb-4">
              <p className="px-2 text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Views</p>
              {navigation.map((item) => {
                const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/");
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-sm font-medium font-mono uppercase tracking-tight
                      ${isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"
                      }`}
                  >
                    <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : "opacity-60"}`} />
                    <span className="flex-1">{item.name}</span>
                    {"badge" in item && item.badge > 0 && (
                      <span className="h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-mono font-bold flex items-center justify-center shadow-[0_0_6px_var(--color-primary)]">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 bg-secondary/30 rounded-md border border-border/50">
            <ActivitySquare className={`h-5 w-5 ${health?.status === 'ok' ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className="flex-1 overflow-hidden">
              <p className="text-[10px] font-medium font-mono text-muted-foreground truncate uppercase">API_STATUS</p>
              <p className={`text-xs font-mono font-bold truncate uppercase ${health?.status === 'ok' ? 'text-primary' : 'text-muted-foreground'}`}>
                {health?.status === 'ok' ? 'ONLINE' : 'OFFLINE'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiAvPgo8cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjMDAwIiAvPgo8L3N2Zz4=')]"></div>

        {/* Top Header */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 relative z-10">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden md:flex items-center gap-2 w-full max-w-md h-9 px-3 rounded-md bg-secondary/50 border border-border text-muted-foreground text-sm font-mono hover:bg-secondary hover:border-border/80 hover:text-foreground transition-all group"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left text-muted-foreground/70">Search records...</span>
              <span className="flex items-center gap-0.5 shrink-0">
                <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-background/60 border border-border/60 text-muted-foreground/60 group-hover:border-border group-hover:text-muted-foreground transition-colors">⌘</kbd>
                <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-background/60 border border-border/60 text-muted-foreground/60 group-hover:border-border group-hover:text-muted-foreground transition-colors">K</kbd>
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2" ref={panelRef}>
            {/* Notification Bell */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => setNotifOpen(o => !o)}
              >
                <Bell className="h-4 w-4" />
                {unread.length > 0 && (
                  <span className="absolute top-1 right-1 h-4 min-w-4 px-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-mono font-bold flex items-center justify-center shadow-[0_0_6px_var(--color-primary)]">
                    {unread.length > 9 ? "9+" : unread.length}
                  </span>
                )}
              </Button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 max-h-[480px] bg-card border border-border rounded-lg shadow-xl overflow-hidden z-50 flex flex-col">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                    <div>
                      <h3 className="font-mono text-xs uppercase font-bold text-foreground">Notifications</h3>
                      {unread.length > 0 && (
                        <p className="text-[10px] font-mono text-primary mt-0.5">{unread.length} unread</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {unread.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[10px] font-mono text-muted-foreground hover:text-primary"
                          onClick={() => unread.forEach(n => markRead.mutate({ id: n.id }))}
                        >
                          <CheckCheck className="h-3 w-3 mr-1" /> Mark all read
                        </Button>
                      )}
                      {notifications && notifications.some(n => n.read) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[10px] font-mono text-muted-foreground hover:text-destructive"
                          onClick={() => clearAll.mutate({})}
                        >
                          Clear read
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => setNotifOpen(false)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1">
                    {!notifications || notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Bell className="h-8 w-8 mb-3 opacity-20" />
                        <p className="font-mono text-xs uppercase">No notifications</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`flex items-start gap-3 px-4 py-3 border-b border-border/40 last:border-0 transition-colors ${n.read ? 'opacity-50' : 'bg-primary/[0.03]'}`}
                        >
                          <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${n.read ? 'bg-muted-foreground/30' : 'bg-primary shadow-[0_0_6px_var(--color-primary)]'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground leading-snug">{n.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                              </span>
                              {n.emailSent && (
                                <span className="text-[10px] font-mono text-primary/70 flex items-center gap-0.5">
                                  <Check className="h-2.5 w-2.5" /> email sent
                                </span>
                              )}
                            </div>
                          </div>
                          {!n.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-primary shrink-0"
                              onClick={() => markRead.mutate({ id: n.id })}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link href="/applications/new">
              <Button size="sm" className="font-mono text-xs h-8 shadow-[0_0_10px_rgba(var(--primary),0.2)]">
                <Plus className="h-4 w-4 mr-2" />
                NEW_ENTRY
              </Button>
            </Link>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-auto bg-background p-4 sm:p-6 lg:p-8 relative z-10">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
