export type RecordStatus =
  | "INGESTED"
  | "NORMALIZED"
  | "MATCHED"
  | "REVIEW_PENDING"
  | "CLUSTERED"
  | "FINALIZED";

export interface RawRecord {
  [key: string]: string | number | null | undefined;
}

export interface ProcessedRecord {
  id: string;
  raw: RawRecord;
  business_name: string;
  cleaned_name: string;
  normalized_name: string;
  root_name: string;
  name_tokens: string[];
  address: string;
  cleaned_address: string;
  normalized_address: string;
  address_tokens: string[];
  pincode: string;
  normalized_pincode: string;
  location_key: string;
  block_key: string;
  owner_key: string;
  business_key: string;
  quality_score: number;
  suspicion_score: number;
  completeness_score: number;
  status: RecordStatus;
  cluster_id?: string;
  flags: string[];
}

export interface DuplicateCandidate {
  id: string;
  record_a: string;
  record_b: string;
  name_score: number;
  address_score: number;
  pincode_score: number;
  final_match_score: number;
  match_status: "AUTO_MATCH" | "REVIEW" | "REJECT";
  confidence_band: "HIGH" | "MEDIUM" | "LOW";
  match_explanation: string;
  matched_features: string[];
  review_decision?: "approved" | "rejected" | "merged" | "flagged";
}

export interface BusinessCluster {
  cluster_id: string;
  canonical_name: string;
  canonical_address: string;
  canonical_pincode: string;
  canonical_record_reason: string;
  member_ids: string[];
  size: number;
  avg_confidence: number;
  source_count: number;
  review_status: "pending" | "approved" | "rejected";
}

export interface AuditEntry {
  ts: number;
  type: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface PipelineStats {
  total: number;
  processed: number;
  clean: number;
  invalid: number;
  review: number;
  duplicates: number;
  clusters: number;
  startTs?: number;
  endTs?: number;
  stage: string;
  progress: number;
  chunkCount: number;
  currentChunk: number;
}

export interface WorkerInMessage {
  type: "process";
  records: RawRecord[];
  fileName: string;
  chunkSize: number;
}

export type WorkerOutMessage =
  | { type: "stage"; stage: string; progress: number; meta?: Record<string, unknown> }
  | { type: "audit"; entry: AuditEntry }
  | {
      type: "complete";
      records: ProcessedRecord[];
      candidates: DuplicateCandidate[];
      clusters: BusinessCluster[];
      audit: AuditEntry[];
      stats: PipelineStats;
    }
  | { type: "error"; message: string };
