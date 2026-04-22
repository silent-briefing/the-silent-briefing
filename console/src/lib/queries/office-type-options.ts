/** Subset aligned with `public.office_type` enum — extend as product grows. */
export const OFFICE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Any office" },
  { value: "state_supreme_justice", label: "State supreme justice" },
  { value: "state_appellate_judge", label: "State appellate judge" },
  { value: "state_district_judge", label: "State district judge" },
  { value: "federal_judge", label: "Federal judge" },
  { value: "governor", label: "Governor" },
  { value: "lt_governor", label: "Lieutenant governor" },
  { value: "attorney_general", label: "Attorney general" },
  { value: "senator", label: "Senator" },
  { value: "representative", label: "Representative" },
  { value: "mayor", label: "Mayor" },
  { value: "city_council", label: "City council" },
  { value: "county_commissioner", label: "County commissioner" },
  { value: "county_clerk", label: "County clerk" },
  { value: "county_mayor", label: "County mayor" },
];
