import { SectionHeader } from "@/components/operator/SectionHeader";

export type JudicialRosterEmptyProps = {
  /** Human label, e.g. "Utah Supreme Court justices". */
  rosterDescription: string;
  /** DB `officials.office_type` value this page queries. */
  officeType: string;
};

/**
 * Shown when a judicial roster query returns zero rows — distinguishes “no data yet” from a broken UI.
 */
export function JudicialRosterEmpty({ rosterDescription, officeType }: JudicialRosterEmptyProps) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface-1 p-8 shadow-[var(--shadow-md)]">
      <SectionHeader className="mb-3 text-[var(--fg-1)]">Roster is empty</SectionHeader>
      <p className="font-serif text-base italic leading-relaxed text-[var(--fg-3)]">
        Navigation is working — there are simply no matching rows for {rosterDescription} in your local
        Supabase, or the signed-in session cannot read them (RLS).
      </p>
      <ul className="mt-6 list-disc space-y-2 pl-5 font-sans text-sm leading-relaxed text-[var(--fg-2)]">
        <li>
          Confirm migrations are applied and a jurisdiction with <code className="text-xs">slug = ut</code>{" "}
          exists.
        </li>
        <li>
          Seed officials with <code className="text-xs">office_type = {officeType}</code> and{" "}
          <code className="text-xs">jurisdiction_id</code> pointing at Utah — e.g. from repo root:{" "}
          <code className="whitespace-pre-wrap text-xs">
            uv run python -m briefing.worker judicial-extraction --persist --no-bios
          </code>
        </li>
        <li>
          Clerk must issue a Supabase-compatible JWT (see <code className="text-xs">docs/plans/04_foundation_supabase_directus.md</code>).
        </li>
      </ul>
    </div>
  );
}
