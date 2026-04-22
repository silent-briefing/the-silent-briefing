const JUDICIAL_OFFICE_TYPES = new Set([
  "state_supreme_justice",
  "state_appellate_judge",
  "state_district_judge",
]);

export function officialDossierHref(officeType: string, slug: string): string {
  if (JUDICIAL_OFFICE_TYPES.has(officeType)) {
    return `/judicial/${slug}`;
  }
  return `/officials/${slug}`;
}
