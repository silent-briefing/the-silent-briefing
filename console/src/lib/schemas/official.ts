import { z } from "zod";

/** Matches Postgres enum `office_type` (see `jurisdiction_officials` migration). */
export const OFFICE_TYPES = [
  "senator",
  "representative",
  "governor",
  "lt_governor",
  "attorney_general",
  "mayor",
  "city_council",
  "county_commissioner",
  "county_clerk",
  "county_mayor",
  "state_supreme_justice",
  "state_appellate_judge",
  "state_district_judge",
  "federal_judge",
] as const;

export type OfficeType = (typeof OFFICE_TYPES)[number];

export const JUDGE_OFFICE_TYPES: ReadonlySet<OfficeType> = new Set([
  "state_supreme_justice",
  "state_appellate_judge",
  "state_district_judge",
  "federal_judge",
]);

export const officeTypeSchema = z.enum(OFFICE_TYPES);

export const subjectAlignmentSchema = z.enum(["gop", "opposition", "neutral", "nonpartisan"]);

const jurisdictionRefSchema = z
  .object({
    name: z.string(),
    slug: z.string(),
  })
  .nullable()
  .optional();

export const officialAdminRowSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  slug: z.string(),
  jurisdiction_id: z.string().uuid(),
  office_type: z.string(),
  party: z.string().nullable().optional(),
  subject_alignment: z.string().nullable().optional(),
  term_start: z.string().nullable().optional(),
  term_end: z.string().nullable().optional(),
  retention_year: z.number().nullable().optional(),
  is_current: z.boolean(),
  photo_url: z.string().nullable().optional(),
  bio_summary: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  deleted_at: z.string().nullable().optional(),
  jurisdictions: jurisdictionRefSchema,
});

export type OfficialAdminRow = z.infer<typeof officialAdminRowSchema>;

export const officialsListResponseSchema = z.object({
  items: z.array(officialAdminRowSchema),
  total: z.number(),
});

export type OfficialsListResponse = z.infer<typeof officialsListResponseSchema>;

const optionalDateString = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.string().nullable().optional(),
);

/** Plain shape — no `.superRefine` so Zod 4 allows `.partial()` for PATCH bodies. */
const officialCreateFieldsSchema = z.object({
  full_name: z.string().min(1),
  slug: z.string().min(1),
  jurisdiction_id: z.string().uuid(),
  office_type: officeTypeSchema,
  party: z.string().nullable().optional(),
  subject_alignment: subjectAlignmentSchema.nullable().optional(),
  term_start: optionalDateString,
  term_end: optionalDateString,
  retention_year: z.preprocess(
    (v) =>
      v === "" || v == null || (typeof v === "number" && Number.isNaN(v)) ? null : v,
    z.number().int().nullable().optional(),
  ),
  is_current: z.boolean(),
  photo_url: z.string().nullable().optional(),
  bio_summary: z.string().nullable().optional(),
});

export const officialCreateSchema = officialCreateFieldsSchema.superRefine((data, ctx) => {
  if (JUDGE_OFFICE_TYPES.has(data.office_type) && data.party != null && data.party !== "") {
    ctx.addIssue({
      code: "custom",
      message: "Judges cannot have a party",
      path: ["party"],
    });
  }
});

export type OfficialCreateInput = z.infer<typeof officialCreateSchema>;

export const officialPatchSchema = officialCreateFieldsSchema.partial().superRefine((data, ctx) => {
  if (
    data.office_type !== undefined &&
    JUDGE_OFFICE_TYPES.has(data.office_type) &&
    data.party !== undefined &&
    data.party != null &&
    data.party !== ""
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Judges cannot have a party",
      path: ["party"],
    });
  }
});

export type OfficialPatchInput = z.infer<typeof officialPatchSchema>;

/** Derive a URL-safe slug from a display name (editable after). */
export function slugFromFullName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
