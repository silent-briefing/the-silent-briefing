import { Suspense } from "react";

import { CompareHub } from "@/components/operator/compare/CompareHub";

import "@/styles/compare-print.css";

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <p className="font-serif text-base italic text-[var(--fg-3)]" aria-busy="true">
          Loading…
        </p>
      }
    >
      <CompareHub />
    </Suspense>
  );
}
