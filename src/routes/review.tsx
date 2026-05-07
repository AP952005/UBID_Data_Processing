import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader, EmptyState } from "@/components/Page";
import { usePipelineStore } from "@/lib/pipeline/store";
import { useMemo, useState } from "react";
import { Check, X, Flag, GitMerge } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/review")({
  head: () => ({ meta: [{ title: "Review Queue — UBID Resolve" }] }),
  component: ReviewPage,
});

function ReviewPage() {
  const { candidates, records, setReviewDecision } = usePipelineStore();
  const recMap = useMemo(() => new Map(records.map((r) => [r.id, r])), [records]);
  const queue = useMemo(
    () => candidates.filter((c) => c.match_status === "REVIEW" && !c.review_decision),
    [candidates],
  );
  const [idx, setIdx] = useState(0);
  const cur = queue[idx];

  if (!candidates.length) {
    return (<><PageHeader title="Review Queue" /><PageContent>
      <EmptyState title="Empty" description="Run the pipeline first." />
    </PageContent></>);
  }

  if (!cur) {
    return (<><PageHeader title="Review Queue" /><PageContent>
      <EmptyState title="Queue clear" description="No pending review pairs. All review-band candidates have been actioned." />
    </PageContent></>);
  }

  const a = recMap.get(cur.record_a)!, b = recMap.get(cur.record_b)!;
  const act = (decision: NonNullable<typeof cur.review_decision>) => {
    setReviewDecision(cur.id, decision);
    toast.success(`Marked ${decision}`);
    setIdx((i) => Math.min(queue.length - 1, i));
  };

  return (
    <>
      <PageHeader title="Review Queue" description={`${queue.length.toLocaleString()} pairs awaiting human review.`} />
      <PageContent>
        <div className="rounded-xl border bg-card p-5 shadow-elegant">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Pair {cur.id} · {idx + 1} of {queue.length}</div>
            <div className="rounded-md bg-warning/15 px-3 py-1 text-xs font-medium text-warning">
              Score {(cur.final_match_score * 100).toFixed(1)}% · {cur.confidence_band}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[a, b].map((r, i) => (
              <div key={r.id} className="rounded-lg border bg-background p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Record {i === 0 ? "A" : "B"}</div>
                <div className="mt-1 font-semibold">{r.business_name}</div>
                <div className="mt-1 text-sm text-muted-foreground">{r.address || "—"}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <Field k="Pincode" v={r.normalized_pincode || "—"} />
                  <Field k="Block" v={r.block_key} />
                  <Field k="Quality" v={`${(r.quality_score * 100).toFixed(0)}%`} />
                  <Field k="Owner key" v={r.owner_key} />
                </div>
                {r.flags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.flags.map((f) => (
                      <span key={f} className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">{f}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border bg-muted/30 p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Match Explanation</div>
            <p className="mt-1 text-sm">{cur.match_explanation}</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <Field k="Name" v={`${(cur.name_score * 100).toFixed(0)}%`} />
              <Field k="Address" v={`${(cur.address_score * 100).toFixed(0)}%`} />
              <Field k="Pincode" v={cur.pincode_score === 1 ? "match" : "differ"} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <ActionBtn onClick={() => act("merged")} icon={<GitMerge className="h-4 w-4" />} label="Merge" tone="success" />
            <ActionBtn onClick={() => act("approved")} icon={<Check className="h-4 w-4" />} label="Approve" tone="info" />
            <ActionBtn onClick={() => act("rejected")} icon={<X className="h-4 w-4" />} label="Reject" tone="destructive" />
            <ActionBtn onClick={() => act("flagged")} icon={<Flag className="h-4 w-4" />} label="Flag" tone="warning" />
            <button onClick={() => setIdx((i) => Math.min(queue.length - 1, i + 1))} className="ml-auto rounded-md border px-4 py-2 text-sm">Skip</button>
          </div>
        </div>
      </PageContent>
    </>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded bg-card px-2 py-1">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="font-mono text-xs">{v}</div>
    </div>
  );
}

function ActionBtn({
  onClick, icon, label, tone,
}: { onClick: () => void; icon: React.ReactNode; label: string; tone: "success" | "info" | "destructive" | "warning" }) {
  const map = {
    success: "bg-success text-success-foreground",
    info: "bg-info text-info-foreground",
    destructive: "bg-destructive text-destructive-foreground",
    warning: "bg-warning text-warning-foreground",
  };
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${map[tone]}`}>
      {icon}{label}
    </button>
  );
}
