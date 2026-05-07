import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader, EmptyState } from "@/components/Page";
import { usePipelineStore } from "@/lib/pipeline/store";
import {
  exportCanonical, exportCandidates, exportClusters, exportJson, exportNormalized, exportReview,
} from "@/lib/pipeline/export";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";

export const Route = createFileRoute("/exports")({
  head: () => ({ meta: [{ title: "Export Center — UBID Resolve" }] }),
  component: ExportsPage,
});

function ExportsPage() {
  const { records, candidates, clusters, audit, stats } = usePipelineStore();

  if (!records.length) {
    return (<><PageHeader title="Export Center" /><PageContent>
      <EmptyState title="Nothing to export" description="Run the pipeline first." />
    </PageContent></>);
  }

  const items = [
    { label: "Normalized Output", desc: "Cleaned + normalized records with keys and scores", icon: FileSpreadsheet, action: () => exportNormalized(records), n: records.length },
    { label: "Duplicate Candidates", desc: "All candidate pairs with similarity scores", icon: FileSpreadsheet, action: () => exportCandidates(candidates), n: candidates.length },
    { label: "Review Queue", desc: "Pairs in REVIEW band with reviewer decisions", icon: FileSpreadsheet, action: () => exportReview(candidates), n: candidates.filter((c) => c.match_status === "REVIEW").length },
    { label: "Business Clusters", desc: "All UBID-ready clusters with members", icon: FileSpreadsheet, action: () => exportClusters(clusters), n: clusters.length },
    { label: "Canonical Businesses", desc: "Best-record canonical profile per cluster", icon: FileSpreadsheet, action: () => exportCanonical(clusters), n: clusters.length },
    { label: "Processing Summary", desc: "Pipeline stats, timing, counts", icon: FileJson, action: () => exportJson(stats, "processing_summary.json"), n: 1 },
    { label: "Audit Log", desc: "Complete audit event stream", icon: FileJson, action: () => exportJson(audit, "audit_log.json"), n: audit.length },
  ];

  return (
    <>
      <PageHeader title="Export Center" description="Download gold-layer outputs for downstream UBID systems and review workflows." />
      <PageContent>
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <button key={it.label} onClick={it.action}
                className="flex items-start gap-3 rounded-xl border bg-card p-4 text-left shadow-elegant transition-transform hover:scale-[1.01] hover:shadow-glow">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{it.label}</div>
                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-[11px]">{it.n.toLocaleString()}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{it.desc}</div>
                </div>
                <Download className="mt-1 h-4 w-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </PageContent>
    </>
  );
}
