import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Smoke: Clerk session. (Server Supabase uses Clerk JWT via `accessToken`; `supabase.auth.*` is unavailable on that client.)
 */
export async function GET() {
  const { userId, orgId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await currentUser();

  return NextResponse.json({
    clerkUserId: userId,
    orgId: orgId ?? null,
    email: user?.primaryEmailAddress?.emailAddress ?? null,
    publicMetadata: user?.publicMetadata ?? {},
    sessionClaims: sessionClaims ?? {},
  });
}
