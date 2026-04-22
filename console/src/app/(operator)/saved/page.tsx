import { Suspense } from "react";

import { SavedViewsHub } from "@/components/operator/saved/SavedViewsHub";

export default function SavedPage() {
  return (
    <Suspense
      fallback={
        <p className="font-serif text-base italic text-[var(--fg-3)]" aria-busy="true">
          Loading…
        </p>
      }
    >
      <SavedViewsHub />
    </Suspense>
  );
}
