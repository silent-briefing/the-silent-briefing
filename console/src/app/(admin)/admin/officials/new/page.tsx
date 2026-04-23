import Link from "next/link";

import { CreateOfficialClient } from "./create-official-client";
import { buttonVariants } from "@/components/ui/button";
import { listJurisdictionOptions } from "@/lib/queries/jurisdictions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminNewOfficialPage() {
  const supabase = await createServerSupabaseClient();
  const jurisdictions = await listJurisdictionOptions(supabase);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/officials"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          ← Back to list
        </Link>
      </div>
      <h1 className="mt-6 font-serif text-2xl font-semibold text-primary">New official</h1>
      {jurisdictions.length === 0 ? (
        <p className="mt-4 font-sans text-sm text-destructive">
          No jurisdictions found — seed the database before creating officials.
        </p>
      ) : (
        <CreateOfficialClient jurisdictions={jurisdictions} />
      )}
    </div>
  );
}
