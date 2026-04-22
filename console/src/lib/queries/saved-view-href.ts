import { officialsFiltersToSearchParams, type OfficialsUrlFilters } from "@/lib/queries/officials-url-filters";
import type { UserSavedViewRow } from "@/lib/queries/schemas";
import { officialDossierHref } from "@/lib/search/hrefs";

/** Resolve a link for a saved view row (operator console routes). */
export function savedViewHref(row: UserSavedViewRow): string | null {
  const q = row.query;
  if (!q || typeof q !== "object") return null;
  const rec = q as Record<string, unknown>;

  switch (row.kind) {
    case "officials": {
      const filters: OfficialsUrlFilters = {
        jurisdictionId: typeof rec.jurisdictionId === "string" ? rec.jurisdictionId : null,
        officeType: typeof rec.officeType === "string" ? rec.officeType : null,
        party: typeof rec.party === "string" ? rec.party : null,
        subjectAlignment: typeof rec.subjectAlignment === "string" ? rec.subjectAlignment : null,
        isCurrent:
          rec.isCurrent === true || rec.isCurrent === false || rec.isCurrent === null
            ? (rec.isCurrent as boolean | null)
            : true,
      };
      const sp = officialsFiltersToSearchParams(filters);
      return sp.toString() ? `/officials?${sp}` : "/officials";
    }
    case "dossier": {
      const slug = typeof rec.slug === "string" ? rec.slug : null;
      const officeType = typeof rec.officeType === "string" ? rec.officeType : null;
      if (!slug || !officeType) return null;
      return officialDossierHref(officeType, slug);
    }
    case "search": {
      const term =
        typeof rec.q === "string"
          ? rec.q
          : typeof rec.query === "string"
            ? rec.query
            : "";
      return term.trim() ? `/search?q=${encodeURIComponent(term.trim())}` : "/search";
    }
    default:
      return null;
  }
}
