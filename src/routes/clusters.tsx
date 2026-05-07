import { createFileRoute, Link } from "@tanstack/react-router";
import { PageContent, PageHeader, EmptyState } from "@/components/Page";
import { usePipelineStore } from "@/lib/pipeline/store";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/clusters")({
  head: () => ({ meta: [{ title: "Cluster Explorer — UBID Resolve" }] }),
  component: ClustersPage,
});

function ClustersPage() {
  const { clusters } = usePipelineStore();
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => clusters.filter((c) => !q || c.canonical_name.toLowerCase().includes(q.toLowerCase()) || c.cluster_id.includes(q)),
    [clusters, q],
  );

  if (!clusters.length) {
    return (<><PageHeader title="Cluster Explorer" /><PageContent>
      <EmptyState title="No clusters" description="Run the pipeline to discover business clusters." />
    </PageContent></>);
  }

  return (
    <>
      <PageHeader
        title="Cluster Explorer"
        description={`${clusters.length.toLocaleString()} UBID-ready business clusters generated via graph clustering.`}
      />
      <PageContent>
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clusters…"
          className="mb-3 w-72 rounded-md border bg-background px-3 py-2 text-sm"
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.slice(0, 60).map((c) => (
            <Link
              key={c.cluster_id} to="/clusters/view" search={{ id: c.cluster_id } as never}
              className="rounded-xl border bg-card p-4 shadow-elegant transition-transform hover:scale-[1.01] hover:shadow-glow"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-muted-foreground">{c.cluster_id}</span>
                <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                  c.review_status === "approved" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                }`}>{c.review_status}</span>
              </div>
              <div className="mt-2 truncate font-semibold">{c.canonical_name}</div>
              <div className="mt-1 truncate text-xs text-muted-foreground">{c.canonical_address || "—"}</div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span>{c.size} members</span>
                <span className="font-mono">{(c.avg_confidence * 100).toFixed(0)}% conf.</span>
              </div>
            </Link>
          ))}
        </div>
      </PageContent>
    </>
  );
}
