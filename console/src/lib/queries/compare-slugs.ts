export const MAX_COMPARE_OFFICIALS = 4;
export const MIN_COMPARE_OFFICIALS = 2;

/** Parse `s` or `slugs` query param: comma/whitespace-separated slugs, de-duped, max 4. */
export function parseCompareSlugs(searchParams: URLSearchParams): string[] {
  const raw = searchParams.get("s") ?? searchParams.get("slugs") ?? "";
  const slugs = raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(slugs)].slice(0, MAX_COMPARE_OFFICIALS);
}

export function compareSlugsToSearchParams(slugs: string[]): URLSearchParams {
  const sp = new URLSearchParams();
  const uniq = [...new Set(slugs)].slice(0, MAX_COMPARE_OFFICIALS);
  if (uniq.length > 0) sp.set("s", uniq.join(","));
  return sp;
}

export function pairKeySlug(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}
