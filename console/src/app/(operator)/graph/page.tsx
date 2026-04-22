import { Suspense } from "react";

import { GraphExplorer } from "./graph-explorer";

export default function GraphPage() {
  return (
    <Suspense
      fallback={
        <p className="font-serif text-base italic text-[var(--fg-3)]" aria-busy="true">
          Loading…
        </p>
      }
    >
      <GraphExplorer />
    </Suspense>
  );
}
