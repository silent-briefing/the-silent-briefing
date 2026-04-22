import type { SupabaseClient } from "@supabase/supabase-js";

import { throwIfPostgrestError } from "@/lib/supabase/postgrest-error";
import type { Database } from "@/lib/supabase/types";

import { alertRowSchema, type AlertRow } from "./schemas";

function parseAlerts(data: unknown): AlertRow[] {
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r) => alertRowSchema.parse(r));
}

export async function listOrgAlerts(
  supabase: SupabaseClient<Database>,
  orgId: string,
  opts?: { limit?: number; unreadOnly?: boolean },
): Promise<AlertRow[]> {
  const limit = opts?.limit ?? 50;
  let q = supabase
    .from("alerts")
    .select("id, org_id, kind, target_type, target_id, payload, delivered_at, read_at")
    .eq("org_id", orgId)
    .order("delivered_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (opts?.unreadOnly) {
    q = q.is("read_at", null);
  }

  const { data, error } = await q;
  throwIfPostgrestError(error);
  return parseAlerts(data);
}

export async function countUnreadAlerts(
  supabase: SupabaseClient<Database>,
  orgId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .is("read_at", null);

  throwIfPostgrestError(error);
  return count ?? 0;
}

export async function markAlertRead(
  supabase: SupabaseClient<Database>,
  alertId: string,
  readAtIso: string,
): Promise<void> {
  const { error } = await supabase
    .from("alerts")
    .update({ read_at: readAtIso })
    .eq("id", alertId);

  throwIfPostgrestError(error);
}
