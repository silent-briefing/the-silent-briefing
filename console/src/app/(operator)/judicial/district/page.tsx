import Link from "next/link";

import { JusticeCard } from "@/components/operator/judicial/JusticeCard";
import { listUtByOfficeType } from "@/lib/queries/officials";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function JudicialDistrictPage() {
  const supabase = await createServerSupabaseClient();
  const judges = await listUtByOfficeType(supabase, "state_district_judge");

  return (
    <div>
      <nav className="font-sans text-xs text-[var(--fg-4)]">
        <Link href="/judicial" className="hover:text-[var(--fg-2)]">
          Judicial
        </Link>
        <span className="mx-2 text-[var(--fg-4)]">·</span>
        <span className="text-[var(--fg-3)]">District Courts</span>
      </nav>
      <p className="mt-4 font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--fg-4)]">
        Utah district courts
      </p>
      <h1 className="mt-2 font-serif text-3xl font-normal text-[var(--fg-1)] md:text-[40px]">
        District judges
      </h1>
      <p className="mt-3 max-w-2xl font-sans text-sm text-[var(--fg-3)]">
        State district judges for Utah. District-level filters (e.g. 3rd District) can follow URL
        search params once metadata is wired.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {judges.length === 0 ? (
          <p className="sm:col-span-2 lg:col-span-3 rounded-[var(--radius-lg)] bg-surface-1 p-6 font-sans text-sm text-[var(--fg-3)] shadow-[var(--shadow-sm)]">
            No district judges in database yet.
          </p>
        ) : (
          judges.map((o) => <JusticeCard key={o.id} official={o} />)
        )}
      </div>
    </div>
  );
}
