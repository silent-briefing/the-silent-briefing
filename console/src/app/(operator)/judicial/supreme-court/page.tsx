import Link from "next/link";

import { JusticeCard } from "@/components/operator/judicial/JusticeCard";
import { JudicialRosterEmpty } from "@/components/operator/judicial/JudicialRosterEmpty";
import { listUtSupremeCourt } from "@/lib/queries/officials";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function JudicialSupremeCourtPage() {
  const supabase = await createServerSupabaseClient();
  const justices = await listUtSupremeCourt(supabase);

  return (
    <div>
      <nav className="font-sans text-xs text-[var(--fg-4)]">
        <Link href="/judicial" className="hover:text-[var(--fg-2)]">
          Judicial
        </Link>
        <span className="mx-2 text-[var(--fg-4)]">·</span>
        <span className="text-[var(--fg-3)]">Supreme Court</span>
      </nav>
      <p className="mt-4 font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--fg-4)]">
        Utah Supreme Court
      </p>
      <h1 className="mt-2 font-serif text-3xl font-normal text-[var(--fg-1)] md:text-[40px]">
        Justices
      </h1>
      <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-[var(--fg-3)]">
        Current roster — select a justice for the dossier. Teasers and deeper opinion surfacing are still rolling out.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-8">
          {justices.length === 0 ? (
            <JudicialRosterEmpty
              rosterDescription="Utah Supreme Court justices"
              officeType="state_supreme_justice"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {justices.map((o) => (
                <JusticeCard key={o.id} official={o} />
              ))}
            </div>
          )}
        </div>
        <aside className="lg:col-span-4">
          <div className="rounded-[var(--radius-lg)] bg-surface-1 p-6 shadow-[var(--shadow-sm)]">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--fg-4)]">
              At a glance
            </p>
            <p className="mt-3 font-serif text-2xl font-normal tabular-nums text-[var(--fg-1)]">
              {justices.length}
            </p>
            <p className="mt-1 font-sans text-xs text-[var(--fg-3)]">seated justices in data</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
