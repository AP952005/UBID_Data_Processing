import { createFileRoute, Link } from "@tanstack/react-router";
import { usePipelineStore } from "@/lib/pipeline/store";
import { PageContent, PageHeader, StatCard, EmptyState } from "@/components/Page";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — UBID Resolve" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { stats, records, candidates, clusters } = usePipelineStore();

  const statusData = [
    { name: "Clean", value: stats.clean, color: "var(--color-success)" },
    { name: "Review", value: stats.review, color: "var(--color-warning)" },
    { name: "Invalid", value: stats.invalid, color: "var(--color-destructive)" },
  ];
  const qualityBuckets = [0, 0, 0, 0, 0];
  records.forEach((r) => {
    const i = Math.min(4, Math.floor(r.quality_score * 5));
    qualityBuckets[i]++;
  });
  const qualityData = qualityBuckets.map((v, i) => ({
    range: `${i * 20}-${(i + 1) * 20}%`, count: v,
  }));

  return (
    <>
      <PageHeader
        title="Identity Resolution Dashboard"
        description="End-to-end view of preprocessing, matching, and clustering across the active dataset."
        actions={
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
          >
            <Upload className="h-4 w-4" /> Upload Dataset
          </Link>
        }
      />
      <PageContent>
        {records.length === 0 ? (
          <EmptyState
            title="No dataset processed yet"
            description="Upload a business registration file (.csv, .xls, .xlsx) to begin the preprocessing and entity resolution pipeline."
            action={
              <Link to="/upload" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                <Upload className="h-4 w-4" /> Go to Upload Center
              </Link>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Total Rows" value={stats.total.toLocaleString()} />
              <StatCard label="Processed" value={stats.processed.toLocaleString()} accent="info" />
              <StatCard label="Clean" value={stats.clean.toLocaleString()} accent="success" />
              <StatCard label="Review" value={stats.review.toLocaleString()} accent="warning" />
              <StatCard label="Invalid" value={stats.invalid.toLocaleString()} accent="destructive" />
              <StatCard label="Clusters" value={stats.clusters.toLocaleString()} hint={`${candidates.length} candidates`} />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border bg-card p-4 shadow-elegant">
                <div className="mb-3 text-sm font-medium">Record Status Distribution</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} dataKey="value" innerRadius={60} outerRadius={90} paddingAngle={2}>
                        {statusData.map((d) => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-elegant">
                <div className="mb-3 text-sm font-medium">Quality Score Histogram</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={qualityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="range" stroke="var(--color-muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border bg-card p-4 shadow-elegant">
                <div className="text-sm font-medium">Top Clusters</div>
                <ul className="mt-3 space-y-2 text-sm">
                  {clusters.slice(0, 6).map((c) => (
                    <li key={c.cluster_id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{c.canonical_name || c.cluster_id}</span>
                      <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">{c.size}</span>
                    </li>
                  ))}
                  {clusters.length === 0 && <li className="text-muted-foreground">No clusters yet.</li>}
                </ul>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-elegant">
                <div className="text-sm font-medium">Match Confidence Bands</div>
                <div className="mt-3 space-y-2 text-sm">
                  {(["HIGH", "MEDIUM", "LOW"] as const).map((b) => {
                    const n = candidates.filter((c) => c.confidence_band === b).length;
                    return (
                      <div key={b} className="flex items-center justify-between">
                        <span>{b}</span>
                        <span className="font-mono text-xs">{n}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-elegant">
                <div className="text-sm font-medium">Pipeline Time</div>
                <div className="mt-3 text-2xl font-semibold tabular-nums">
                  {stats.endTs && stats.startTs ? `${((stats.endTs - stats.startTs) / 1000).toFixed(2)}s` : "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {stats.chunkCount} chunks · {stats.processed.toLocaleString()} rows
                </div>
              </div>
            </div>
          </>
        )}
      </PageContent>
    </>
  );
}
