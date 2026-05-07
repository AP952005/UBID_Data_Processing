import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader, EmptyState } from "@/components/Page";
import { usePipelineStore } from "@/lib/pipeline/store";

export const Route = createFileRoute("/logs")({
  head: () => ({ meta: [{ title: "Processing Logs — UBID Resolve" }] }),
  component: LogsPage,
});

function LogsPage() {
  const { audit } = usePipelineStore();
  if (!audit.length) {
    return (<><PageHeader title="Processing Logs" /><PageContent>
      <EmptyState title="No logs yet" description="Run the pipeline to populate audit logs." />
    </PageContent></>);
  }
  return (
    <>
      <PageHeader title="Processing Logs" description={`${audit.length.toLocaleString()} audit events captured.`} />
      <PageContent>
        <div className="rounded-xl border bg-card font-mono text-xs shadow-elegant">
          <div className="max-h-[70vh] overflow-y-auto scrollbar-thin">
            {audit.map((e, i) => (
              <div key={i} className="grid grid-cols-[180px_120px_1fr] gap-3 border-b px-4 py-2 last:border-0">
                <span className="text-muted-foreground">{new Date(e.ts).toISOString()}</span>
                <span className="rounded bg-muted px-2 py-0.5">{e.type}</span>
                <span>{e.message}</span>
              </div>
            ))}
          </div>
        </div>
      </PageContent>
    </>
  );
}
