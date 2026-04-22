import { describe, expect, it } from "vitest";

import { claimHasAdversarialFlag, dossierClaimRowSchema, officialCardRowSchema } from "./schemas";

describe("operator query schemas", () => {
  it("parses official card row", () => {
    const row = officialCardRowSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      slug: "justice-hagen",
      full_name: "Justice Hagen",
      office_type: "state_supreme_justice",
      bio_summary: null,
      retention_year: 2026,
      subject_alignment: "neutral",
      photo_url: null,
      jurisdiction_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      is_current: true,
    });
    expect(row.slug).toBe("justice-hagen");
  });

  it("parses dossier claim with metadata default", () => {
    const row = dossierClaimRowSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440001",
      official_id: "550e8400-e29b-41d4-a716-446655440000",
      claim_text: "Retention vote context",
      category: "Retention Voting",
      pipeline_stage: "writer_sonar",
      source_url: "https://vote.utah.gov/",
      published: true,
      metadata: {},
      created_at: "2026-04-21T12:00:00.000Z",
      updated_at: "2026-04-21T12:00:00.000Z",
    });
    expect(row.published).toBe(true);
  });

  it("claimHasAdversarialFlag reads metadata + category", () => {
    const base = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      official_id: "550e8400-e29b-41d4-a716-446655440000",
      claim_text: "x",
      category: "Overview",
      pipeline_stage: "writer_sonar" as const,
      source_url: null,
      published: true,
      metadata: {},
      created_at: "2026-04-21T12:00:00.000Z",
      updated_at: "2026-04-21T12:00:00.000Z",
    };
    expect(claimHasAdversarialFlag(dossierClaimRowSchema.parse(base))).toBe(false);
    expect(
      claimHasAdversarialFlag(
        dossierClaimRowSchema.parse({
          ...base,
          metadata: { adversarial: true },
        }),
      ),
    ).toBe(true);
    expect(
      claimHasAdversarialFlag(
        dossierClaimRowSchema.parse({
          ...base,
          category: "Adversarial review",
        }),
      ),
    ).toBe(true);
  });
});
