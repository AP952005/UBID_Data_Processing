import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader, StatCard } from "@/components/Page";
import { usePipelineStore } from "@/lib/pipeline/store";

export const Route = createFileRoute("/monitor")({
  head: () => ({ meta: [{ title: "Processing Monitor — UBID Resolve" }] }),
  component: Monitor,
});

const STAGES = ["ingest", "normalizing", "blocking", "matching", "clustering", "complete"];

function Monitor() {
  const { stats, isProcessing, audit } = usePipelineStore();
  const stageIdx = Math.max(0, STAGES.indexOf(stats.stage));

  return (
    <>
      <PageHeader title="Processing Monitor" description="Live pipeline state, stages, chunk progress, and audit stream." />
      <PageContent>
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard label="Stage" value={stats.stage} accent="info" />
          <StatCard label="Progress" value={`${(stats.progress * 100).toFixed(0)}%`} accent="primary" />
          <StatCard label="Chunk" value={`${stats.currentChunk}/${stats.chunkCount}`} />
          <StatCard label="Status" value={isProcessing ? "Running" : "Idle"} accent={isProcessing ? "warning" : "success"} />
        </div>

        <div className="mt-6 rounded-xl border bg-card p-4 shadow-elegant">
          <div className="mb-3 text-sm font-medium">Pipeline Stages</div>
          <div className="space-y-3">
            {STAGES.map((s, i) => {
              const done = i < stageIdx || stats.stage === "complete";
              const active = i === stageIdx && stats.stage !== "complete";
              return (
                <div key={s} className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    done ? "bg-success text-success-foreground" :
                    active ? "bg-primary text-primary-foreground animate-pulse" :
                    "bg-muted text-muted-foreground"
                  }`}>{i + 1}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium capitalize">{s}</div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-primary transition-all"
                        style={{ width: done ? "100%" : active ? `${(stats.progress * 100).toFixed(0)}%` : "0%" }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 rounded-xl border bg-card shadow-elegant">
          <div className="border-b px-4 py-3 text-sm font-medium">Audit Stream</div>
          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            <table className="w-full text-xs">
              <tbody>
                {audit.slice().reverse().map((e, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="w-32 px-4 py-2 font-mono text-muted-foreground">{new Date(e.ts).toLocaleTimeString()}</td>
                    <td className="w-32 px-4 py-2"><span className="rounded bg-muted px-2 py-0.5 font-mono">{e.type}</span></td>
                    <td className="px-4 py-2">{e.message}</td>
                  </tr>
                ))}
                {audit.length === 0 && (
                  <tr><td className="px-4 py-6 text-center text-muted-foreground">No events yet — upload and run the pipeline.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </PageContent>
    </>
  );
}
