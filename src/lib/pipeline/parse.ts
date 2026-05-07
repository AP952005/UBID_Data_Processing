import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { RawRecord } from "./types";

export interface ParseResult {
  rows: RawRecord[];
  columns: string[];
}

export async function parseFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return parseCsv(file);
  return parseXlsx(file);
}

function parseCsv(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const rows: RawRecord[] = [];
    let columns: string[] = [];
    Papa.parse<RawRecord>(file, {
      header: true,
      skipEmptyLines: true,
      worker: false,
      step: (results) => {
        if (!columns.length && results.meta.fields) columns = results.meta.fields;
        rows.push(results.data);
      },
      complete: () => resolve({ rows, columns }),
      error: (err) => reject(err),
    });
  });
}

async function parseXlsx(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<RawRecord>(sheet, { defval: "" });
  const columns = rows.length ? Object.keys(rows[0]) : [];
  return { rows, columns };
}
