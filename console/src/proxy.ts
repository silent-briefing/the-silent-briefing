import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  roleFromClerkOrganizationClaims,
  roleFromPublicAndUserClaims,
  roleFromSessionClaims,
} from "@/lib/auth/guards";
import { roleAtLeast, type Role } from "@/lib/auth/roles";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health(.*)",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

function isDevPrimitivesStoryboard(req: NextRequest) {
  return (
    process.env.NODE_ENV === "development" &&
    req.nextUrl.pathname.startsWith("/_/")
  );
}

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req) || isDevPrimitivesStoryboard(req)) {
    return NextResponse.next();
  }

  await auth.protect();

  const { sessionClaims, orgRole } = await auth();
  const rawRole = roleFromSessionClaims(sessionClaims);
  const effectiveRole: Role = rawRole ?? "viewer";

  if (isAdminRoute(req)) {
    if (!roleAtLeast(effectiveRole, "admin")) {
      console.error(
        JSON.stringify({
          event: "role_denied",
          path: req.nextUrl.pathname,
          required: "admin",
          effective_role: effectiveRole,
          from_public_metadata: roleFromPublicAndUserClaims(sessionClaims) ?? null,
          from_org_claims: roleFromClerkOrganizationClaims(sessionClaims) ?? null,
          clerk_auth_org_role: orgRole ?? null,
          hint: "Set user public_metadata.role, or use Clerk org Admin with that org active in the session",
        }),
      );
      return NextResponse.redirect(new URL("/?denied=admin-required", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
