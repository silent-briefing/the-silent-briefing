import type { DossierClaimRow } from "./schemas";

/** Stable sort key for grouping (America/Denver calendar day). */
export function denverCalendarDayKey(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function formatDenverDisplayDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    dateStyle: "long",
  }).format(new Date(iso));
}

export type TimelineDayGroup = { dayKey: string; heading: string; claims: DossierClaimRow[] };

/** Groups claims by calendar day in Mountain Time; days ordered oldest → newest. */
export function groupClaimsByDenverDay(claims: DossierClaimRow[]): TimelineDayGroup[] {
  const map = new Map<string, DossierClaimRow[]>();
  for (const c of claims) {
    const k = denverCalendarDayKey(c.created_at);
    const arr = map.get(k);
    if (arr) arr.push(c);
    else map.set(k, [c]);
  }
  const keys = [...map.keys()].sort();
  return keys.map((dayKey) => {
    const list = map.get(dayKey)!;
    return {
      dayKey,
      heading: formatDenverDisplayDate(list[0]!.created_at),
      claims: list,
    };
  });
}
