// Core preprocessing utilities used by the worker.
// Pure functions, no DOM/browser-only APIs.

const LEGAL_SUFFIXES = [
  "pvt ltd", "private limited", "ltd", "limited", "llp", "llc",
  "inc", "incorporated", "corp", "corporation", "co", "company",
  "and sons", "& sons", "and co", "& co", "enterprises", "enterprise",
  "industries", "industry", "trading", "traders", "agencies", "agency",
  "associates", "associate", "group", "international", "global",
];

const ADDRESS_NORMALIZATIONS: Record<string, string> = {
  road: "rd", street: "st", layout: "lyt", cross: "crs",
  building: "bldg", apartment: "apt", floor: "flr", block: "blk",
  near: "nr", opposite: "opp", behind: "bhd", main: "mn",
  nagar: "ngr", colony: "cly", phase: "ph", sector: "sec",
};

const STOPWORDS = new Set([
  "the", "and", "of", "in", "at", "by", "for", "to", "a", "an",
  "with", "from", "on", "or", "is", "are", "be",
]);

const GARBAGE_TOKENS = new Set([
  "test", "xxx", "xxxx", "xxxxx", "na", "n/a", "null", "none", "nil",
  "abc", "abcd", "12345", "123", "asdf", "qwerty", "qwer", "zzz",
  "aaa", "bbb", "blank", "unknown", "tbd", "tba", ".", "#", "-",
]);

export const normalizeColumn = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

const stripDiacritics = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const cleanText = (input: unknown): string => {
  if (input == null) return "";
  return stripDiacritics(String(input))
    .replace(/[\u200b-\u200f\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

export const cleanBusinessName = (raw: string): string => {
  let s = cleanText(raw).toLowerCase();
  s = s.replace(/[^a-z0-9& ]+/g, " ").replace(/\s+/g, " ").trim();
  return s;
};

export const normalizeBusinessName = (cleaned: string): string => {
  let s = cleaned;
  for (const suf of LEGAL_SUFFIXES) {
    const re = new RegExp(`\\b${suf.replace(/[&+]/g, "\\$&")}\\b\\.?$`, "i");
    s = s.replace(re, "");
  }
  return s.replace(/&/g, "and").replace(/\s+/g, " ").trim();
};

export const tokenize = (s: string): string[] =>
  s
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));

export const rootName = (normalized: string): string => {
  const tokens = tokenize(normalized).filter((t) => t.length >= 2);
  if (tokens.length === 0) return normalized.slice(0, 4);
  // Sort tokens to absorb word-order changes
  return [...tokens].sort().join(" ");
};

export const cleanAddress = (raw: string): string => {
  let s = cleanText(raw).toLowerCase();
  s = s.replace(/[#*]+/g, " ");
  s = s.replace(/[^a-z0-9, ]+/g, " ");
  s = s.replace(/,+/g, ",").replace(/\s+/g, " ").trim();
  return s;
};

export const normalizeAddress = (cleaned: string): string => {
  const tokens = cleaned.split(/[ ,]+/).filter(Boolean);
  const dedup: string[] = [];
  let prev = "";
  for (const t of tokens) {
    const norm = ADDRESS_NORMALIZATIONS[t] ?? t;
    if (norm !== prev) dedup.push(norm);
    prev = norm;
  }
  return dedup.join(" ");
};

export const extractPincode = (raw: string): string => {
  const m = String(raw ?? "").match(/(?<!\d)(\d{6})(?!\d)/);
  return m ? m[1] : "";
};

export const normalizePincode = (raw: string): string => {
  const digits = String(raw ?? "").replace(/\D+/g, "");
  return digits.length === 6 ? digits : "";
};

export const computeQuality = (
  name: string,
  addr: string,
  pin: string,
): { quality: number; suspicion: number; completeness: number; flags: string[] } => {
  const flags: string[] = [];
  const nameTokens = tokenize(name);
  const addrTokens = tokenize(addr);
  let suspicion = 0;
  let quality = 1;
  let completeness = 0;

  if (name) completeness += 0.4;
  if (addr) completeness += 0.4;
  if (pin) completeness += 0.2;

  if (!name) { flags.push("missing_name"); quality -= 0.5; suspicion += 0.4; }
  else if (name.length < 3) { flags.push("short_name"); quality -= 0.3; suspicion += 0.3; }

  if (!addr) { flags.push("missing_address"); quality -= 0.3; suspicion += 0.3; }
  else if (addr.length < 8) { flags.push("short_address"); quality -= 0.2; suspicion += 0.2; }

  if (!pin) { flags.push("missing_pincode"); quality -= 0.15; suspicion += 0.1; }

  const allTokens = [...nameTokens, ...addrTokens];
  const garbage = allTokens.filter((t) => GARBAGE_TOKENS.has(t));
  if (garbage.length) { flags.push("garbage_tokens"); quality -= 0.25 * Math.min(garbage.length, 3); suspicion += 0.3; }

  // repeated tokens
  const uniq = new Set(allTokens);
  if (allTokens.length > 4 && uniq.size / allTokens.length < 0.5) {
    flags.push("repetitive"); quality -= 0.2; suspicion += 0.2;
  }
  // numeric only
  if (name && /^\d+$/.test(name.replace(/\s+/g, ""))) {
    flags.push("numeric_only_name"); quality -= 0.3; suspicion += 0.4;
  }

  quality = Math.max(0, Math.min(1, quality));
  suspicion = Math.max(0, Math.min(1, suspicion));
  return { quality, suspicion, completeness, flags };
};

export const blockKey = (pin: string, normName: string): string => {
  const tokens = tokenize(normName);
  const base = tokens[0] ?? normName.replace(/\s+/g, "").slice(0, 3);
  return `${pin || "000000"}_${base.slice(0, 3)}`;
};

export const ownerKey = (normName: string, pin: string): string => {
  const tokens = tokenize(normName).slice(0, 2).join("");
  return `${tokens.slice(0, 6)}_${pin || "000000"}`;
};

export const businessKey = (normName: string, addr: string, pin: string): string => {
  const n = tokenize(normName).slice(0, 3).join("");
  const a = tokenize(addr).slice(0, 2).join("");
  return `${n.slice(0, 8)}_${a.slice(0, 6)}_${pin || "000000"}`;
};

// Try to find best column by candidates
export const pickColumn = (
  row: Record<string, unknown>,
  candidates: string[],
): string => {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const found = keys.find((k) => k === cand);
    if (found && row[found] != null) return String(row[found]);
  }
  for (const cand of candidates) {
    const found = keys.find((k) => k.includes(cand));
    if (found && row[found] != null) return String(row[found]);
  }
  return "";
};
