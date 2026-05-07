import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader, StatCard } from "@/components/Page";
import { usePipelineStore } from "@/lib/pipeline/store";
import { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/metrics")({
  head: () => ({ meta: [{ title: "System Metrics — UBID Resolve" }] }),
  component: MetricsPage,
});

function MetricsPage() {
  const { stats, records, clusters, candidates } = usePipelineStore();
  const elapsed = stats.endTs && stats.startTs ? (stats.endTs - stats.startTs) / 1000 : 0;
  const tput = elapsed ? stats.processed / elapsed : 0;

  const sizeBuckets = useMemo(() => {
    const m = new Map<string, number>();
    clusters.forEach((c) => {
      const k = c.size <= 2 ? "2" : c.size <= 5 ? "3-5" : c.size <= 10 ? "6-10" : "11+";
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return ["2", "3-5", "6-10", "11+"].map((k) => ({ size: k, count: m.get(k) ?? 0 }));
  }, [clusters]);

  return (
    <>
      <PageHeader title="System Metrics" description="Pipeline performance, throughput, and architecture indicators." />
      <PageContent>
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard label="Throughput" value={`${tput.toFixed(0)} rows/s`} accent="info" />
          <StatCard label="Elapsed" value={`${elapsed.toFixed(2)}s`} />
          <StatCard label="Chunks" value={stats.chunkCount} accent="primary" />
          <StatCard label="Match Rate" value={records.length ? `${(candidates.length / records.length * 100).toFixed(2)}%` : "—"} accent="warning" />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-4 shadow-elegant">
            <div className="mb-3 text-sm font-medium">Cluster Size Distribution</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sizeBuckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="size" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--color-chart-5)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-elegant">
            <div className="mb-3 text-sm font-medium">Architecture Layers</div>
            <ul className="space-y-2 text-sm">
              {[
                ["Ingestion", "CSV/XLSX streaming"],
                ["Bronze raw", "in-memory chunked store"],
                ["Normalization", "name + address + pincode"],
                ["Quality", "scoring + flag detection"],
                ["Blocking", "pincode + name prefix → Spark partitions"],
                ["Matching", "token-sort + partial + Jaccard"],
                ["Entity Resolution", "graph union-find → GraphFrames"],
                ["Clustering", "connected components"],
                ["Review", "human queue + decisions"],
                ["Gold output", "canonical profiles + exports"],
                ["Audit", "full event trail"],
              ].map(([k, v]) => (
                <li key={k} className="flex items-center justify-between border-b pb-1.5 last:border-0">
                  <span className="font-medium">{k}</span>
                  <span className="text-xs text-muted-foreground">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PageContent>
    </>
  );
}
