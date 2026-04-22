const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type OfficialsUrlFilters = {
  jurisdictionId: string | null;
  officeType: string | null;
  party: string | null;
  subjectAlignment: string | null;
  isCurrent: boolean | null;
};

export function defaultOfficialsUrlFilters(): OfficialsUrlFilters {
  return {
    jurisdictionId: null,
    officeType: null,
    party: null,
    subjectAlignment: null,
    isCurrent: true,
  };
}

export function officialsFiltersFromSearchParams(searchParams: URLSearchParams): OfficialsUrlFilters {
  const j = searchParams.get("j");
  const office = searchParams.get("office");
  const party = searchParams.get("party");
  const align = searchParams.get("align");
  const current = searchParams.get("current");

  let isCurrent: boolean | null = true;
  if (current === "all") isCurrent = null;
  else if (current === "0" || current === "false") isCurrent = false;
  else if (current === "1" || current === "true") isCurrent = true;

  return {
    jurisdictionId: j && UUID_RE.test(j) ? j : null,
    officeType: office?.trim() ? office.trim() : null,
    party: party?.trim() ? party.trim() : null,
    subjectAlignment: align?.trim() ? align.trim() : null,
    isCurrent,
  };
}

export function officialsFiltersToSearchParams(f: OfficialsUrlFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.jurisdictionId) sp.set("j", f.jurisdictionId);
  if (f.officeType) sp.set("office", f.officeType);
  if (f.party) sp.set("party", f.party);
  if (f.subjectAlignment) sp.set("align", f.subjectAlignment);
  if (f.isCurrent === null) sp.set("current", "all");
  else if (f.isCurrent === false) sp.set("current", "0");
  else sp.set("current", "1");
  return sp;
}
