import { create } from "zustand";
import type {
  AuditEntry, BusinessCluster, DuplicateCandidate, PipelineStats, ProcessedRecord, RawRecord, WorkerOutMessage,
} from "@/lib/pipeline/types";

interface UploadInfo {
  fileName: string;
  fileSize: number;
  rowsDetected: number;
  columns: string[];
  schemaPreview: RawRecord[];
}

interface State {
  upload?: UploadInfo;
  records: ProcessedRecord[];
  candidates: DuplicateCandidate[];
  clusters: BusinessCluster[];
  audit: AuditEntry[];
  stats: PipelineStats;
  isProcessing: boolean;
  setUpload: (u: UploadInfo) => void;
  startProcessing: (raw: RawRecord[], fileName: string, chunkSize?: number) => Promise<void>;
  reset: () => void;
  setReviewDecision: (id: string, decision: DuplicateCandidate["review_decision"]) => void;
}

const emptyStats = (): PipelineStats => ({
  total: 0, processed: 0, clean: 0, invalid: 0, review: 0, duplicates: 0,
  clusters: 0, stage: "idle", progress: 0, chunkCount: 0, currentChunk: 0,
});

export const usePipelineStore = create<State>((set, get) => ({
  records: [],
  candidates: [],
  clusters: [],
  audit: [],
  stats: emptyStats(),
  isProcessing: false,
  setUpload: (u) => set({ upload: u }),
  reset: () => set({
    records: [], candidates: [], clusters: [], audit: [], stats: emptyStats(),
    isProcessing: false, upload: undefined,
  }),
  setReviewDecision: (id, decision) =>
    set((s) => ({
      candidates: s.candidates.map((c) => (c.id === id ? { ...c, review_decision: decision } : c)),
    })),
  startProcessing: async (raw, fileName, chunkSize = 5000) => {
    set({ isProcessing: true, audit: [], records: [], candidates: [], clusters: [],
      stats: { ...emptyStats(), total: raw.length, stage: "starting" } });
    const worker = new Worker(new URL("@/lib/pipeline/worker.ts", import.meta.url), { type: "module" });
    await new Promise<void>((resolve, reject) => {
      worker.onmessage = (ev: MessageEvent<WorkerOutMessage>) => {
        const msg = ev.data;
        if (msg.type === "stage") {
          set((s) => ({ stats: { ...s.stats, stage: msg.stage, progress: msg.progress } }));
        } else if (msg.type === "audit") {
          set((s) => ({ audit: [...s.audit, msg.entry] }));
        } else if (msg.type === "complete") {
          set({
            records: msg.records, candidates: msg.candidates, clusters: msg.clusters,
            stats: msg.stats, isProcessing: false,
          });
          worker.terminate();
          resolve();
        } else if (msg.type === "error") {
          set({ isProcessing: false });
          worker.terminate();
          reject(new Error(msg.message));
        }
      };
      worker.onerror = (e) => {
        set({ isProcessing: false });
        worker.terminate();
        reject(new Error(e.message));
      };
      worker.postMessage({ type: "process", records: raw, fileName, chunkSize });
    });
    void get();
  },
}));
