import { createFileRoute, Link } from "@tanstack/react-router";
import { PageContent, PageHeader, EmptyState } from "@/components/Page";
import { usePipelineStore } from "@/lib/pipeline/store";
import { useMemo } from "react";
import { z } from "zod";

const search = z.object({ id: z.string().optional() });

export const Route = createFileRoute("/clusters/view")({
  validateSearch: search,
  head: () => ({ meta: [{ title: "Business Cluster — UBID Resolve" }] }),
  component: ClusterView,
});

function ClusterView() {
  const { id } = Route.useSearch();
  const { clusters, records, candidates } = usePipelineStore();
  const recMap = useMemo(() => new Map(records.map((r) => [r.id, r])), [records]);
  const cluster = clusters.find((c) => c.cluster_id === id) ?? clusters[0];

  if (!cluster) {
    return (<><PageHeader title="Business Cluster" /><PageContent>
      <EmptyState title="No cluster" description="Open a cluster from the Cluster Explorer." />
    </PageContent></>);
  }

  const members = cluster.member_ids.map((m) => recMap.get(m)!).filter(Boolean);
  const internal = candidates.filter(
    (c) => cluster.member_ids.includes(c.record_a) && cluster.member_ids.includes(c.record_b),
  );

  return (
    <>
      <PageHeader
        title={cluster.canonical_name || cluster.cluster_id}
        description={`${cluster.size} linked records · ${(cluster.avg_confidence * 100).toFixed(1)}% avg confidence`}
        actions={<Link to="/clusters" className="rounded-md border px-3 py-2 text-sm">← Back to Explorer</Link>}
      />
      <PageContent>
        <div className="rounded-xl border bg-gradient-surface p-4 shadow-elegant">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Canonical Profile</div>
          <div className="mt-1 text-lg font-semibold">{cluster.canonical_name}</div>
          <div className="text-sm text-muted-foreground">{cluster.canonical_address}</div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <Pill k="Pincode" v={cluster.canonical_pincode || "—"} />
            <Pill k="Cluster ID" v={cluster.cluster_id} />
            <Pill k="Status" v={cluster.review_status} />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">{cluster.canonical_record_reason}</div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {members.map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-4 shadow-elegant">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{r.business_name}</div>
                <span className="font-mono text-[11px] text-muted-foreground">{r.id}</span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{r.address || "—"}</div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <Pill k="Pin" v={r.normalized_pincode || "—"} />
                <Pill k="Quality" v={`${(r.quality_score * 100).toFixed(0)}%`} />
                <Pill k="Block" v={r.block_key} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border bg-card shadow-elegant">
          <div className="border-b px-4 py-3 text-sm font-medium">Internal Match Edges ({internal.length})</div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">A</th>
                  <th className="px-3 py-2 text-left">B</th>
                  <th className="px-3 py-2 text-right">Name</th>
                  <th className="px-3 py-2 text-right">Address</th>
                  <th className="px-3 py-2 text-right">Pin</th>
                  <th className="px-3 py-2 text-right">Score</th>
                  <th className="px-3 py-2 text-left">Explanation</th>
                </tr>
              </thead>
              <tbody>
                {internal.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{c.record_a}</td>
                    <td className="px-3 py-2 font-mono text-xs">{c.record_b}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{(c.name_score * 100).toFixed(0)}%</td>
                    <td className="px-3 py-2 text-right tabular-nums">{(c.address_score * 100).toFixed(0)}%</td>
                    <td className="px-3 py-2 text-right">{c.pincode_score === 1 ? "✓" : "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{(c.final_match_score * 100).toFixed(1)}%</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{c.match_explanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PageContent>
    </>
  );
}

function Pill({ k, v }: { k: string; v: string }) {
  return (
    <span className="rounded-md bg-muted px-2 py-1 font-mono text-[11px]">
      <span className="text-muted-foreground">{k}: </span>{v}
    </span>
  );
}
