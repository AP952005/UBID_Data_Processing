import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader, StatCard, EmptyState } from "@/components/Page";
import { usePipelineStore } from "@/lib/pipeline/store";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { useMemo } from "react";

export const Route = createFileRoute("/quality")({
  head: () => ({ meta: [{ title: "Quality Analytics — UBID Resolve" }] }),
  component: QualityPage,
});

function QualityPage() {
  const { records } = usePipelineStore();

  const flagCounts = useMemo(() => {
    const m = new Map<string, number>();
    records.forEach((r) => r.flags.forEach((f) => m.set(f, (m.get(f) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([flag, count]) => ({ flag, count }));
  }, [records]);

  const pinDist = useMemo(() => {
    const m = new Map<string, number>();
    records.forEach((r) => {
      const k = r.normalized_pincode || "missing";
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([pin, count]) => ({ pin, count }));
  }, [records]);

  if (!records.length) {
    return (
      <>
        <PageHeader title="Quality Analytics" />
        <PageContent>
          <EmptyState title="No data" description="Run the pipeline to view quality analytics." />
        </PageContent>
      </>
    );
  }

  const avgQ = records.reduce((s, r) => s + r.quality_score, 0) / records.length;
  const avgC = records.reduce((s, r) => s + r.completeness_score, 0) / records.length;
  const suspicious = records.filter((r) => r.suspicion_score >= 0.5).length;

  return (
    <>
      <PageHeader title="Quality Analytics" description="Quality, completeness, suspicion and flag distribution across the dataset." />
      <PageContent>
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard label="Avg Quality" value={`${(avgQ * 100).toFixed(1)}%`} accent="success" />
          <StatCard label="Avg Completeness" value={`${(avgC * 100).toFixed(1)}%`} accent="info" />
          <StatCard label="Suspicious Records" value={suspicious.toLocaleString()} accent="destructive" />
          <StatCard label="Distinct Flags" value={flagCounts.length} accent="warning" />
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-4 shadow-elegant">
            <div className="mb-3 text-sm font-medium">Top Data Quality Flags</div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flagCounts.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis dataKey="flag" type="category" width={140} stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--color-chart-4)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-elegant">
            <div className="mb-3 text-sm font-medium">Pincode Distribution (Top 12)</div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pinDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="pin" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </PageContent>
    </>
  );
}
