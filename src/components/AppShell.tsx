import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Upload, Activity, Gauge, GitMerge, ListChecks,
  Boxes, Building2, ScrollText, BarChart3, Download, Database, Moon, Sun,
} from "lucide-react";
import { useEffect, useState } from "react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "Upload Center", icon: Upload },
  { to: "/monitor", label: "Processing Monitor", icon: Activity },
  { to: "/quality", label: "Quality Analytics", icon: Gauge },
  { to: "/candidates", label: "Duplicate Candidates", icon: GitMerge },
  { to: "/review", label: "Review Queue", icon: ListChecks },
  { to: "/clusters", label: "Cluster Explorer", icon: Boxes },
  { to: "/clusters/view", label: "Business Cluster", icon: Building2 },
  { to: "/logs", label: "Processing Logs", icon: ScrollText },
  { to: "/metrics", label: "System Metrics", icon: BarChart3 },
  { to: "/exports", label: "Export Center", icon: Download },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const isDark = stored ? stored === "dark" : window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    setDark(!!isDark);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-5 py-5 border-b">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">UBID Resolve</div>
            <div className="text-[11px] text-muted-foreground">Identity Platform</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = path === to;
            return (
              <Link
                key={to}
                to={to}
                className={`mx-2 my-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3 text-[11px] text-muted-foreground">
          <div className="font-mono">v1.0 · Spark-ready</div>
          <div>chunked · scalable · auditable</div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              Enterprise Business Identity Resolution
            </span>
          </div>
          <button
            onClick={() => setDark((d) => !d)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-accent"
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </header>
        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
