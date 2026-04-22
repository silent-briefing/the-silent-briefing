import { Suspense } from "react";

import { AlertsHub } from "@/components/operator/alerts/AlertsHub";

export default function AlertsPage() {
  return (
    <Suspense
      fallback={
        <p className="font-serif text-base italic text-[var(--fg-3)]" aria-busy="true">
          Loading…
        </p>
      }
    >
      <AlertsHub />
    </Suspense>
  );
}
