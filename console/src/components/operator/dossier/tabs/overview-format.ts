import type { OfficialCardRow } from "@/lib/queries/schemas";

export function formatOfficeTypeLabel(officeType: string): string {
  return officeType.replace(/_/g, " ");
}

/** Copy for roster context — term columns not on `OfficialCardRow` until a dossier detail query expands. */
export function overviewKeyFacts(official: OfficialCardRow, jurisdictionName: string) {
  return {
    jurisdictionName,
    officeLabel: formatOfficeTypeLabel(official.office_type),
    alignment: official.subject_alignment,
    retentionYear: official.retention_year,
    isCurrent: official.is_current,
  };
}
