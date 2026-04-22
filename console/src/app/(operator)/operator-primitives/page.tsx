import { notFound } from "next/navigation";

import { OperatorPrimitivesBoard } from "@/components/operator/operator-primitives-board";

export const dynamic = "force-dynamic";

/**
 * Phase B.2 dev board (plan: `app/(operator)/_primitives/page.tsx`).
 * Route: `/operator-primitives` — `_primitives` is a private segment in Next.js; this path is equivalent for local review.
 */
export default function OperatorPrimitivesPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-surface p-8">
      <OperatorPrimitivesBoard />
    </main>
  );
}
