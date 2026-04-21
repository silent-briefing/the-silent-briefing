import { notFound } from "next/navigation";

import { PrimitivesBoard } from "./primitives-board";

export const dynamic = "force-dynamic";

export default function DevPrimitivesPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-surface p-8">
      <PrimitivesBoard />
    </main>
  );
}
