"use client";

import dynamic from "next/dynamic";

import type { EntityGraphInnerProps } from "./EntityGraphInner";

const EntityGraphInner = dynamic(
  () => import("./EntityGraphInner").then((m) => ({ default: m.EntityGraphInner })),
  {
    ssr: false,
    loading: () => (
      <p className="font-serif text-base italic text-[var(--fg-3)]" aria-busy="true">
        Loading graph…
      </p>
    ),
  },
);

export function EntityGraph(props: EntityGraphInnerProps) {
  return <EntityGraphInner {...props} />;
}
