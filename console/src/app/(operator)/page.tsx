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

export default async function BriefingHomePage() {
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
