import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader, EmptyState } from "@/components/Page";
import { usePipelineStore } from "@/lib/pipeline/store";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/candidates")({
  head: () => ({ meta: [{ title: "Duplicate Candidates — UBID Resolve" }] }),
  component: CandidatesPage,
});

function CandidatesPage() {
  const { candidates, records } = usePipelineStore();
  const [filter, setFilter] = useState<"ALL" | "AUTO_MATCH" | "REVIEW" | "REJECT">("ALL");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const recMap = useMemo(() => new Map(records.map((r) => [r.id, r])), [records]);
  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (filter !== "ALL" && c.match_status !== filter) return false;
      if (!q) return true;
      const a = recMap.get(c.record_a), b = recMap.get(c.record_b);
      const hay = `${a?.business_name} ${b?.business_name}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [candidates, filter, q, recMap]);

  const pageRows = filtered.slice(page * pageSize, (page + 1) * pageSize);

  if (!candidates.length) {
    return (
      <>
        <PageHeader title="Duplicate Candidates" />
        <PageContent>
          <EmptyState title="No candidates yet" description="Run the pipeline to detect duplicates via blocking + fuzzy matching." />
        </PageContent>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Duplicate Candidates"
        description={`${candidates.length.toLocaleString()} candidate pairs detected via blocking + fuzzy matching.`}
      />
      <PageContent>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="Search by business name…"
            className="w-72 rounded-md border bg-background px-3 py-2 text-sm"
          />
          <div className="flex gap-1 rounded-md border p-1">
            {(["ALL", "AUTO_MATCH", "REVIEW", "REJECT"] as const).map((s) => (
              <button key={s}
                onClick={() => { setFilter(s); setPage(0); }}
                className={`rounded px-3 py-1 text-xs font-medium ${
                  filter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                }`}>{s}</button>
            ))}
          </div>
          <div className="ml-auto text-xs text-muted-foreground">{filtered.length.toLocaleString()} results</div>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-card shadow-elegant scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="px-3 py-2 text-left">Pair</th>
                <th className="px-3 py-2 text-left">Business A</th>
                <th className="px-3 py-2 text-left">Business B</th>
                <th className="px-3 py-2 text-right">Name</th>
                <th className="px-3 py-2 text-right">Address</th>
                <th className="px-3 py-2 text-right">Pin</th>
                <th className="px-3 py-2 text-right">Score</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Band</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((c) => {
                const a = recMap.get(c.record_a), b = recMap.get(c.record_b);
                return (
                  <tr key={c.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{c.id}</td>
                    <td className="px-3 py-2"><div className="truncate max-w-[220px]">{a?.business_name}</div><div className="text-[11px] text-muted-foreground truncate max-w-[220px]">{a?.address}</div></td>
                    <td className="px-3 py-2"><div className="truncate max-w-[220px]">{b?.business_name}</div><div className="text-[11px] text-muted-foreground truncate max-w-[220px]">{b?.address}</div></td>
                    <td className="px-3 py-2 text-right tabular-nums">{(c.name_score * 100).toFixed(0)}%</td>
                    <td className="px-3 py-2 text-right tabular-nums">{(c.address_score * 100).toFixed(0)}%</td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.pincode_score === 1 ? "✓" : "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{(c.final_match_score * 100).toFixed(1)}%</td>
                    <td className="px-3 py-2"><span className={`rounded px-2 py-0.5 text-xs font-medium ${
                      c.match_status === "AUTO_MATCH" ? "bg-success/15 text-success" :
                      c.match_status === "REVIEW" ? "bg-warning/15 text-warning" :
                      "bg-destructive/15 text-destructive"
                    }`}>{c.match_status}</span></td>
                    <td className="px-3 py-2 text-xs">{c.confidence_band}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div>Page {page + 1} of {Math.max(1, Math.ceil(filtered.length / pageSize))}</div>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded border px-3 py-1 disabled:opacity-50">Prev</button>
            <button disabled={(page + 1) * pageSize >= filtered.length} onClick={() => setPage((p) => p + 1)} className="rounded border px-3 py-1 disabled:opacity-50">Next</button>
          </div>
        </div>
      </PageContent>
    </>
  );
}
