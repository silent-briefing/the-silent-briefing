import type { SupabaseClient } from "@supabase/supabase-js";

import { throwIfPostgrestError } from "@/lib/supabase/postgrest-error";
import type { Database, Json } from "@/lib/supabase/types";

import {
  savedViewKindSchema,
  userSavedViewRowSchema,
  type UserSavedViewRow,
} from "./schemas";

function parseViews(data: unknown): UserSavedViewRow[] {
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r) => userSavedViewRowSchema.parse(r));
}

export async function listUserSavedViews(
  supabase: SupabaseClient<Database>,
  userId: string,
  opts?: { orgId?: string },
): Promise<UserSavedViewRow[]> {
  let q = supabase
    .from("user_saved_views")
    .select("id, user_id, org_id, name, kind, query, created_at")
    .eq("user_id", userId);
  if (opts?.orgId) {
    q = q.eq("org_id", opts.orgId);
  }
  const { data, error } = await q.order("created_at", { ascending: false });

  throwIfPostgrestError(error);
  return parseViews(data);
}

export type NewSavedViewInput = {
  userId: string;
  orgId: string;
  name: string;
  kind: UserSavedViewRow["kind"];
  query: Json;
};

export async function createSavedView(
  supabase: SupabaseClient<Database>,
  input: NewSavedViewInput,
): Promise<UserSavedViewRow> {
  savedViewKindSchema.parse(input.kind);

  const { data, error } = await supabase
    .from("user_saved_views")
    .insert({
      user_id: input.userId,
      org_id: input.orgId,
      name: input.name,
      kind: input.kind,
      query: input.query,
    })
    .select("id, user_id, org_id, name, kind, query, created_at")
    .single();

  throwIfPostgrestError(error);
  return userSavedViewRowSchema.parse(data);
}

export async function updateSavedView(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: { name?: string; kind?: UserSavedViewRow["kind"]; query?: Json },
): Promise<UserSavedViewRow> {
  if (patch.kind !== undefined) savedViewKindSchema.parse(patch.kind);

  const updateRow: Database["public"]["Tables"]["user_saved_views"]["Update"] = {};
  if (patch.name !== undefined) updateRow.name = patch.name;
  if (patch.kind !== undefined) updateRow.kind = patch.kind;
  if (patch.query !== undefined) updateRow.query = patch.query;

  const { data, error } = await supabase
    .from("user_saved_views")
    .update(updateRow)
    .eq("id", id)
    .select("id, user_id, org_id, name, kind, query, created_at")
    .single();

  throwIfPostgrestError(error);
  return userSavedViewRowSchema.parse(data);
}

export async function deleteSavedView(supabase: SupabaseClient<Database>, id: string): Promise<void> {
  const { error } = await supabase.from("user_saved_views").delete().eq("id", id);
  throwIfPostgrestError(error);
}
