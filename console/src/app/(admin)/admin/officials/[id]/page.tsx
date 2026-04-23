import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { bffJson, BffHttpError } from "@/lib/bff/client";
import { listJurisdictionOptions } from "@/lib/queries/jurisdictions";
import { officialAdminRowSchema } from "@/lib/schemas/official";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";

import { EditOfficialClient } from "./edit-official-client";

export default async function AdminEditOfficialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { getToken } = await auth();
  const supabase = await createServerSupabaseClient();
  const jurisdictions = await listJurisdictionOptions(supabase);

  let initial;
  try {
    initial = await bffJson({
      path: `/v1/admin/officials/${id}`,
      getToken: () => getToken(),
      schema: officialAdminRowSchema,
    });
  } catch (e) {
    if (e instanceof BffHttpError && e.status === 404) notFound();
    throw e;
  }

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
      <h1 className="mt-6 font-serif text-2xl font-semibold text-primary">Edit official</h1>
      <p className="mt-2 font-mono text-sm text-[var(--fg-3)]">{initial.slug}</p>
      <EditOfficialClient jurisdictions={jurisdictions} initial={initial} />
    </div>
  );
}
