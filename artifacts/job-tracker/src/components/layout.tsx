import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Briefcase, BellRing, Settings, Search, Plus, ActivitySquare, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHealthCheck } from "@workspace/api-client-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: health } = useHealthCheck();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Applications", href: "/applications", icon: Briefcase },
    { name: "Job Alerts", href: "/alerts", icon: BellRing },
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
                    {item.name}
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
            <div className="relative w-full max-w-md hidden md:flex">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search records..." 
                className="pl-9 bg-secondary/50 border-border font-mono text-sm h-9 w-full focus-visible:ring-1 transition-colors hover:bg-secondary focus:bg-background"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
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
    </div>
  );
}