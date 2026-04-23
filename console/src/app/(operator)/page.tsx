import { auth } from "@clerk/nextjs/server";

import { BriefingHero } from "@/components/operator/briefing/BriefingHero";
import { LiveExtractionLog } from "@/components/operator/briefing/LiveExtractionLog";
import { PriorityList } from "@/components/operator/briefing/PriorityList";
import { StatsStrip } from "@/components/operator/briefing/StatsStrip";
import {
  getBriefingPriorityOfficials,
  loadBriefingIntelSummaryOrEmpty,
} from "@/lib/queries/briefing";
import { listUtSupremeCourt } from "@/lib/queries/officials";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function BriefingHomePage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { getToken, orgId } = await auth();

  const headlineDate = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const timestampLine = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date());

  const utSupreme = await listUtSupremeCourt(supabase);

  const [claimsRes, alertsRes, priorityItems, intel] = await Promise.all([
    supabase.from("dossier_claims").select("id", { count: "exact", head: true }),
    orgId
      ? supabase.from("alerts").select("id", { count: "exact", head: true }).eq("org_id", orgId)
      : Promise.resolve({ count: 0, error: null as null }),
    getBriefingPriorityOfficials(supabase, utSupreme),
    loadBriefingIntelSummaryOrEmpty(() => getToken()),
  ]);

  const publishedClaims = claimsRes.error ? 0 : (claimsRes.count ?? 0);
  const alertsCount =
    "error" in alertsRes && alertsRes.error ? 0 : (alertsRes.count ?? 0);

  const summary = `${publishedClaims.toLocaleString("en-US")} published claims · ${intel.total_runs.toLocaleString("en-US")} intelligence runs · ${alertsCount.toLocaleString("en-US")} alerts for your org.`;

  return (
    <div>
      {denied === "admin-required" ? (
        <div
          className="mb-6 rounded-lg border border-[var(--secondary)]/25 bg-[var(--secondary)]/5 px-4 py-3 font-sans text-sm text-[var(--fg-2)]"
          role="status"
        >
          <p className="font-medium text-[var(--fg-1)]">Admin access required</p>
          <p className="mt-1 text-[var(--fg-3)]">
            Admin requires either{" "}
            <span className="font-mono text-xs">public_metadata.role: &quot;admin&quot;</span> on your
            Clerk user, or the{" "}
            <span className="font-mono text-xs">Admin</span> role in a Clerk organization that is
            currently active (use the org switcher). Then sign out and back in if claims look stale.
          </p>
        </div>
      ) : null}
      <BriefingHero
        headlineDate={headlineDate}
        timestampLine={timestampLine}
        summary={summary}
      />
      <StatsStrip
        publishedClaims={publishedClaims}
        intelligenceRuns={intel.total_runs}
        alerts={alertsCount}
      />
      <PriorityList items={priorityItems} />
      <LiveExtractionLog runs={intel.recent_runs} />
    </div>
  );
}
