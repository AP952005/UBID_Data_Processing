export function PageHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="border-b bg-gradient-surface">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function PageContent({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-6 py-6">{children}</div>;
}

export function StatCard({
  label, value, hint, accent = "primary",
}: {
  label: string; value: React.ReactNode; hint?: string;
  accent?: "primary" | "success" | "warning" | "destructive" | "info";
}) {
  const accentMap: Record<string, string> = {
    primary: "from-primary/15 to-primary/0 border-primary/20",
    success: "from-success/15 to-success/0 border-success/20",
    warning: "from-warning/15 to-warning/0 border-warning/20",
    destructive: "from-destructive/15 to-destructive/0 border-destructive/20",
    info: "from-info/15 to-info/0 border-info/20",
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 shadow-elegant ${accentMap[accent]}`}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function EmptyState({
  title, description, action,
}: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 px-6 py-16 text-center">
      <div className="text-base font-medium">{title}</div>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
