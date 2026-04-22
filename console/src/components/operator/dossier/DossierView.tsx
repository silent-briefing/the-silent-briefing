import { notFound } from "next/navigation";

import { getBySlug } from "@/lib/queries/officials";
import { getJurisdictionLabel } from "@/lib/queries/jurisdictions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { DossierBookmarkButton } from "./DossierBookmarkButton";
import { DossierHeader } from "./DossierHeader";
import { DossierTabsShell } from "./DossierTabsShell";

export type DossierViewProps = {
  slug: string;
  parentNav: { href: string; label: string };
};

export async function DossierView({ slug, parentNav }: DossierViewProps) {
  const supabase = await createServerSupabaseClient();
  const official = await getBySlug(supabase, slug);
  if (!official) notFound();

  const jurisdictionName =
    (await getJurisdictionLabel(supabase, official.jurisdiction_id)) ?? "Jurisdiction";

  return (
    <div className="max-w-5xl">
      <DossierHeader
        official={official}
        jurisdictionName={jurisdictionName}
        parentNav={parentNav}
        actions={
          <DossierBookmarkButton
            slug={official.slug}
            officeType={official.office_type}
            fullName={official.full_name}
          />
        }
      />
      <div className="py-10">
        <DossierTabsShell
          officialId={official.id}
          official={official}
          jurisdictionName={jurisdictionName}
        />
      </div>
    </div>
  );
}
