import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { PageContent, PageHeader } from "@/components/Page";
import { parseFile } from "@/lib/pipeline/parse";
import { usePipelineStore } from "@/lib/pipeline/store";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/upload")({
  head: () => ({ meta: [{ title: "Upload Center — UBID Resolve" }] }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const { setUpload, startProcessing, isProcessing } = usePipelineStore();
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [chunkSize, setChunkSize] = useState(5000);
  const [preview, setPreview] = useState<{
    fileName: string; fileSize: number; columns: string[]; rows: Record<string, unknown>[];
  } | null>(null);
  const [allRows, setAllRows] = useState<Record<string, unknown>[]>([]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;
    if (!/\.(csv|xls|xlsx)$/i.test(file.name)) {
      toast.error("Unsupported file type. Use .csv, .xls, .xlsx");
      return;
    }
    setParsing(true);
    try {
      const { rows, columns } = await parseFile(file);
      setAllRows(rows);
      setPreview({
        fileName: file.name, fileSize: file.size, columns,
        rows: rows.slice(0, 5),
      });
      setUpload({
        fileName: file.name, fileSize: file.size,
        rowsDetected: rows.length, columns, schemaPreview: rows.slice(0, 5),
      });
      toast.success(`Detected ${rows.length.toLocaleString()} rows · ${columns.length} columns`);
    } catch (e) {
      toast.error(`Failed to parse: ${(e as Error).message}`);
    } finally {
      setParsing(false);
    }
  }, [setUpload]);

  const onRun = async () => {
    if (!preview || !allRows.length) return;
    toast.info(`Starting pipeline on ${allRows.length.toLocaleString()} rows…`);
    try {
      await startProcessing(allRows, preview.fileName, chunkSize);
      toast.success("Pipeline complete");
      navigate({ to: "/monitor" });
    } catch (e) {
      toast.error(`Processing failed: ${(e as Error).message}`);
    }
  };

  return (
    <>
      <PageHeader title="Upload Center" description="Drag and drop or select a business registration dataset (.csv, .xls, .xlsx). Up to ~100MB supported." />
      <PageContent>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false);
            void handleFiles(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all ${
            dragOver ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-card"
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            <Upload className="h-6 w-6" />
          </div>
          <div className="mt-4 text-base font-medium">Drop your dataset here</div>
          <div className="mt-1 text-sm text-muted-foreground">CSV, XLS, XLSX · streamed, chunked, memory-safe</div>
          <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <FileSpreadsheet className="h-4 w-4" /> Choose file
            <input
              type="file" accept=".csv,.xls,.xlsx" className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </label>
          {parsing && (
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Parsing file…
            </div>
          )}
        </div>

        {preview && (
          <div className="mt-6 rounded-xl border bg-card p-4 shadow-elegant">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{preview.fileName}</div>
                <div className="text-xs text-muted-foreground">
                  {(preview.fileSize / (1024 * 1024)).toFixed(2)} MB · {allRows.length.toLocaleString()} rows · {preview.columns.length} columns
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Chunk size
                  <input
                    type="number" min={500} max={50000} step={500} value={chunkSize}
                    onChange={(e) => setChunkSize(Math.max(500, Number(e.target.value) || 5000))}
                    className="w-24 rounded-md border bg-background px-2 py-1 text-sm"
                  />
                </label>
                <button
                  disabled={isProcessing}
                  onClick={onRun}
                  className="inline-flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Run pipeline
                </button>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto rounded-md border scrollbar-thin">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    {preview.columns.slice(0, 8).map((c) => (
                      <th key={c} className="px-3 py-2 text-left font-medium">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r, i) => (
                    <tr key={i} className="border-t">
                      {preview.columns.slice(0, 8).map((c) => (
                        <td key={c} className="max-w-[220px] truncate px-3 py-2 text-muted-foreground">
                          {String(r[c] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </PageContent>
    </>
  );
}
