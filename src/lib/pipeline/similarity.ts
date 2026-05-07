// Similarity functions for matching layer.

const lev = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length, n = b.length;
  let prev = new Array(n + 1).fill(0).map((_, i) => i);
  let cur = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
};

export const ratio = (a: string, b: string): number => {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const d = lev(a, b);
  return 1 - d / Math.max(a.length, b.length);
};

export const tokenSortRatio = (a: string, b: string): number => {
  const ta = a.split(/\s+/).filter(Boolean).sort().join(" ");
  const tb = b.split(/\s+/).filter(Boolean).sort().join(" ");
  return ratio(ta, tb);
};

export const partialRatio = (a: string, b: string): number => {
  if (!a || !b) return 0;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (!shorter.length) return 0;
  let best = 0;
  const step = Math.max(1, Math.floor(shorter.length / 4));
  for (let i = 0; i + shorter.length <= longer.length; i += step) {
    const r = ratio(shorter, longer.slice(i, i + shorter.length));
    if (r > best) best = r;
    if (best === 1) return 1;
  }
  return best;
};

export const jaccard = (a: string[], b: string[]): number => {
  if (!a.length && !b.length) return 1;
  const sa = new Set(a), sb = new Set(b);
  let inter = 0;
  sa.forEach((x) => { if (sb.has(x)) inter++; });
  return inter / (sa.size + sb.size - inter || 1);
};
