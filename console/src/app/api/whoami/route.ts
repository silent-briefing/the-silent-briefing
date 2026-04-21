import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Smoke: Clerk session + Supabase sees the same JWT subject as `auth.jwt()->>'sub'`.
 * Requires Clerk Supabase integration or `supabase` JWT template with matching `sub`.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  return NextResponse.json({
    clerkUserId: userId,
    supabaseUser: data.user
      ? { id: data.user.id, role: data.user.role }
      : null,
    supabaseAuthError: error?.message ?? null,
  });
}
