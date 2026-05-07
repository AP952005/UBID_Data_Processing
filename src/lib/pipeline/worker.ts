/// <reference lib="webworker" />
import type {
  AuditEntry,
  BusinessCluster,
  DuplicateCandidate,
  PipelineStats,
  ProcessedRecord,
  RawRecord,
  WorkerInMessage,
  WorkerOutMessage,
} from "./types";
import {
  blockKey,
  businessKey,
  cleanAddress,
  cleanBusinessName,
  cleanText,
  computeQuality,
  extractPincode,
  normalizeAddress,
  normalizeBusinessName,
  normalizePincode,
  ownerKey,
  pickColumn,
  rootName,
  tokenize,
} from "./normalize";
import { jaccard, partialRatio, tokenSortRatio } from "./similarity";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

const post = (msg: WorkerOutMessage) => ctx.postMessage(msg);

const NAME_COLS = ["enterprise_name", "business_name", "name", "firm_name", "company_name", "trade_name"];
const ADDR_COLS = ["address", "registered_address", "office_address", "addr"];
const PIN_COLS = ["pincode", "pin_code", "pin", "postal_code", "zip"];

const audit = (entries: AuditEntry[], type: string, message: string, meta?: Record<string, unknown>) => {
  const e: AuditEntry = { ts: Date.now(), type, message, meta };
  entries.push(e);
  post({ type: "audit", entry: e });
};

ctx.onmessage = async (ev: MessageEvent<WorkerInMessage>) => {
  if (ev.data.type !== "process") return;
  const { records: raw, fileName, chunkSize } = ev.data;

  const auditLog: AuditEntry[] = [];
  const stats: PipelineStats = {
    total: raw.length, processed: 0, clean: 0, invalid: 0, review: 0,
    duplicates: 0, clusters: 0, startTs: Date.now(), stage: "ingest",
    progress: 0, chunkCount: Math.ceil(raw.length / chunkSize), currentChunk: 0,
  };

  audit(auditLog, "ingest", `Ingested ${raw.length} rows from ${fileName}`);
  post({ type: "stage", stage: "normalizing", progress: 0.05 });

  const processed: ProcessedRecord[] = [];

  for (let c = 0; c < stats.chunkCount; c++) {
    const start = c * chunkSize;
    const end = Math.min(start + chunkSize, raw.length);
    stats.currentChunk = c + 1;
    for (let i = start; i < end; i++) {
      const row = raw[i] as Record<string, unknown>;
      const rawName = pickColumn(row, NAME_COLS);
      const rawAddr = pickColumn(row, ADDR_COLS);
      const rawPin = pickColumn(row, PIN_COLS);

      const cleanedName = cleanBusinessName(rawName);
      const normName = normalizeBusinessName(cleanedName);
      const root = rootName(normName);
      const nameTokens = tokenize(normName);

      const cleanedAddr = cleanAddress(rawAddr);
      const normAddr = normalizeAddress(cleanedAddr);
      const addrTokens = tokenize(normAddr);

      let pin = normalizePincode(rawPin);
      if (!pin && rawAddr) pin = extractPincode(rawAddr);

      const q = computeQuality(normName, normAddr, pin);
      const bk = blockKey(pin, normName);
      const ok = ownerKey(normName, pin);
      const bizk = businessKey(normName, normAddr, pin);

      processed.push({
        id: `r${i + 1}`,
        raw: row as RawRecord,
        business_name: cleanText(rawName),
        cleaned_name: cleanedName,
        normalized_name: normName,
        root_name: root,
        name_tokens: nameTokens,
        address: cleanText(rawAddr),
        cleaned_address: cleanedAddr,
        normalized_address: normAddr,
        address_tokens: addrTokens,
        pincode: cleanText(rawPin),
        normalized_pincode: pin,
        location_key: pin,
        block_key: bk,
        owner_key: ok,
        business_key: bizk,
        quality_score: q.quality,
        suspicion_score: q.suspicion,
        completeness_score: q.completeness,
        status: q.flags.length > 2 ? "REVIEW_PENDING" : "NORMALIZED",
        flags: q.flags,
      });

      stats.processed++;
      if (q.suspicion >= 0.5) stats.invalid++;
      else if (q.quality >= 0.7) stats.clean++;
      else stats.review++;
    }
    post({
      type: "stage",
      stage: "normalizing",
      progress: 0.05 + 0.45 * ((c + 1) / stats.chunkCount),
      meta: { chunk: c + 1, of: stats.chunkCount },
    });
  }
  audit(auditLog, "normalize", `Normalized ${processed.length} records in ${stats.chunkCount} chunks`);

  // BLOCKING
  post({ type: "stage", stage: "blocking", progress: 0.55 });
  const blocks = new Map<string, ProcessedRecord[]>();
  for (const r of processed) {
    if (!r.normalized_name) continue;
    const arr = blocks.get(r.block_key) ?? [];
    arr.push(r);
    blocks.set(r.block_key, arr);
  }
  audit(auditLog, "blocking", `Generated ${blocks.size} blocks (avg ${(processed.length / blocks.size).toFixed(1)} per block)`);

  // MATCHING within blocks
  post({ type: "stage", stage: "matching", progress: 0.6 });
  const candidates: DuplicateCandidate[] = [];
  let blockIdx = 0;
  for (const [, members] of blocks) {
    blockIdx++;
    if (members.length < 2) continue;
    // Cap block to avoid explosion on pathological data
    const list = members.slice(0, 200);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        const nameTs = tokenSortRatio(a.normalized_name, b.normalized_name);
        const namePr = partialRatio(a.normalized_name, b.normalized_name);
        const nameJ = jaccard(a.name_tokens, b.name_tokens);
        const nameScore = Math.max(nameTs, (namePr + nameJ) / 2);
        if (nameScore < 0.5) continue;
        const addrScore = a.normalized_address && b.normalized_address
          ? Math.max(tokenSortRatio(a.normalized_address, b.normalized_address), jaccard(a.address_tokens, b.address_tokens))
          : 0;
        const pinScore = a.normalized_pincode && a.normalized_pincode === b.normalized_pincode ? 1 : 0;
        const finalScore = nameScore * 0.6 + addrScore * 0.3 + pinScore * 0.1;
        if (finalScore < 0.6) continue;

        const status: DuplicateCandidate["match_status"] =
          finalScore >= 0.9 ? "AUTO_MATCH" : finalScore >= 0.7 ? "REVIEW" : "REJECT";
        const band: DuplicateCandidate["confidence_band"] =
          finalScore >= 0.9 ? "HIGH" : finalScore >= 0.75 ? "MEDIUM" : "LOW";
        const features: string[] = [];
        if (nameScore >= 0.85) features.push("name_match");
        if (pinScore === 1) features.push("pincode_match");
        if (addrScore >= 0.7) features.push("address_match");
        const reasons: string[] = [
          `name similarity = ${(nameScore * 100).toFixed(0)}%`,
          pinScore === 1 ? "same pincode" : "different pincode",
          addrScore > 0 ? `address similarity = ${(addrScore * 100).toFixed(0)}%` : "no address overlap",
        ];

        candidates.push({
          id: `c${candidates.length + 1}`,
          record_a: a.id,
          record_b: b.id,
          name_score: nameScore,
          address_score: addrScore,
          pincode_score: pinScore,
          final_match_score: finalScore,
          match_status: status,
          confidence_band: band,
          match_explanation: `Matched because: ${reasons.join("; ")}`,
          matched_features: features,
        });
        if (status === "AUTO_MATCH") {
          a.status = "MATCHED"; b.status = "MATCHED";
        } else if (status === "REVIEW") {
          if (a.status !== "MATCHED") a.status = "REVIEW_PENDING";
          if (b.status !== "MATCHED") b.status = "REVIEW_PENDING";
        }
      }
    }
    if (blockIdx % 50 === 0) {
      post({ type: "stage", stage: "matching", progress: 0.6 + 0.2 * (blockIdx / blocks.size) });
    }
  }
  stats.duplicates = candidates.length;
  audit(auditLog, "matching", `Generated ${candidates.length} duplicate candidates`);

  // CLUSTERING via union-find on AUTO_MATCH + REVIEW (HIGH/MEDIUM)
  post({ type: "stage", stage: "clustering", progress: 0.85 });
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let p = parent.get(x) ?? x;
    if (p === x) return x;
    const r = find(p);
    parent.set(x, r);
    return r;
  };
  const union = (a: string, b: string) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const r of processed) parent.set(r.id, r.id);
  for (const c of candidates) {
    if (c.final_match_score >= 0.75) union(c.record_a, c.record_b);
  }
  const groups = new Map<string, string[]>();
  for (const r of processed) {
    const root = find(r.id);
    const arr = groups.get(root) ?? [];
    arr.push(r.id);
    groups.set(root, arr);
  }
  const clusters: BusinessCluster[] = [];
  let cIdx = 0;
  const recById = new Map(processed.map((r) => [r.id, r]));
  for (const [, members] of groups) {
    if (members.length < 2) continue;
    cIdx++;
    const id = `CLUSTER_${String(cIdx).padStart(6, "0")}`;
    const recs = members.map((m) => recById.get(m)!).filter(Boolean);
    // canonical = highest quality, longest name, with pincode
    const canonical = [...recs].sort((a, b) => {
      const sa = a.quality_score + (a.normalized_pincode ? 0.1 : 0) + a.business_name.length * 0.001;
      const sb = b.quality_score + (b.normalized_pincode ? 0.1 : 0) + b.business_name.length * 0.001;
      return sb - sa;
    })[0];
    const memberCands = candidates.filter(
      (c) => members.includes(c.record_a) && members.includes(c.record_b),
    );
    const avgConf = memberCands.length
      ? memberCands.reduce((s, c) => s + c.final_match_score, 0) / memberCands.length
      : 0;
    for (const r of recs) {
      r.cluster_id = id;
      r.status = "CLUSTERED";
    }
    clusters.push({
      cluster_id: id,
      canonical_name: canonical.business_name || canonical.normalized_name,
      canonical_address: canonical.address || canonical.normalized_address,
      canonical_pincode: canonical.normalized_pincode,
      canonical_record_reason: `Highest quality (${(canonical.quality_score * 100).toFixed(0)}%) + most complete record`,
      member_ids: members,
      size: members.length,
      avg_confidence: avgConf,
      source_count: new Set(members).size,
      review_status: avgConf >= 0.9 ? "approved" : "pending",
    });
  }
  stats.clusters = clusters.length;
  audit(auditLog, "clustering", `Generated ${clusters.length} business clusters`);

  // FINALIZE
  for (const r of processed) {
    if (r.status === "CLUSTERED" || r.status === "MATCHED") r.status = "FINALIZED";
  }
  stats.endTs = Date.now();
  stats.stage = "complete";
  stats.progress = 1;

  post({ type: "stage", stage: "complete", progress: 1 });
  post({ type: "complete", records: processed, candidates, clusters, audit: auditLog, stats });
};
