import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { roleFromSessionClaims } from "@/lib/auth/guards";
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

  const { sessionClaims } = await auth();
  const rawRole = roleFromSessionClaims(sessionClaims);
  const effectiveRole: Role = rawRole ?? "viewer";

  if (isAdminRoute(req)) {
    if (!roleAtLeast(effectiveRole, "admin")) {
      console.error(
        JSON.stringify({
          event: "role_denied",
          path: req.nextUrl.pathname,
          required: "admin",
          actual: rawRole ?? null,
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
