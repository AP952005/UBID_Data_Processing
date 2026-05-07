import type { BusinessCluster, DuplicateCandidate, ProcessedRecord } from "./types";

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

export const toCsv = (rows: Record<string, unknown>[]): string => {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : Array.isArray(v) ? v.join("|") : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [
    cols.join(","),
    ...rows.map((r) => cols.map((c) => escape(r[c])).join(",")),
  ].join("\n");
};

export const exportNormalized = (records: ProcessedRecord[]) => {
  const rows = records.map((r) => ({
    id: r.id,
    business_name: r.business_name,
    cleaned_name: r.cleaned_name,
    normalized_name: r.normalized_name,
    root_name: r.root_name,
    address: r.address,
    normalized_address: r.normalized_address,
    pincode: r.normalized_pincode,
    block_key: r.block_key,
    owner_key: r.owner_key,
    quality_score: r.quality_score.toFixed(3),
    suspicion_score: r.suspicion_score.toFixed(3),
    completeness_score: r.completeness_score.toFixed(3),
    status: r.status,
    cluster_id: r.cluster_id ?? "",
    flags: r.flags.join("|"),
  }));
  downloadBlob(new Blob([toCsv(rows)], { type: "text/csv" }), "normalized_output.csv");
};

export const exportCandidates = (cands: DuplicateCandidate[]) => {
  downloadBlob(
    new Blob([toCsv(cands as unknown as Record<string, unknown>[])], { type: "text/csv" }),
    "duplicate_candidates.csv",
  );
};

export const exportClusters = (clusters: BusinessCluster[]) => {
  const rows = clusters.map((c) => ({
    cluster_id: c.cluster_id,
    canonical_name: c.canonical_name,
    canonical_address: c.canonical_address,
    canonical_pincode: c.canonical_pincode,
    size: c.size,
    avg_confidence: c.avg_confidence.toFixed(3),
    review_status: c.review_status,
    members: c.member_ids.join("|"),
  }));
  downloadBlob(new Blob([toCsv(rows)], { type: "text/csv" }), "business_clusters.csv");
};

export const exportCanonical = (clusters: BusinessCluster[]) => {
  const rows = clusters.map((c) => ({
    cluster_id: c.cluster_id,
    canonical_name: c.canonical_name,
    canonical_address: c.canonical_address,
    canonical_pincode: c.canonical_pincode,
    reason: c.canonical_record_reason,
  }));
  downloadBlob(new Blob([toCsv(rows)], { type: "text/csv" }), "canonical_businesses.csv");
};

export const exportReview = (cands: DuplicateCandidate[]) => {
  const rows = cands.filter((c) => c.match_status === "REVIEW").map((c) => ({
    id: c.id,
    record_a: c.record_a,
    record_b: c.record_b,
    final_match_score: c.final_match_score.toFixed(3),
    confidence_band: c.confidence_band,
    decision: c.review_decision ?? "pending",
    explanation: c.match_explanation,
  }));
  downloadBlob(new Blob([toCsv(rows)], { type: "text/csv" }), "review_queue.csv");
};

export const exportJson = (data: unknown, name: string) => {
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), name);
};
