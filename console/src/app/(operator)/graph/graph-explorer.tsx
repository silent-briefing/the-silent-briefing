"use client";

import { useSearchParams } from "next/navigation";

import { EntityGraph } from "@/components/operator/graph/EntityGraph";

export function GraphExplorer() {
  const sp = useSearchParams();
  const entity = sp.get("entity");

  return (
    <div className="max-w-5xl">
      <nav className="font-sans text-xs text-[var(--fg-4)]">
        <span className="text-[var(--fg-3)]">Graph</span>
      </nav>
      <p className="mt-4 font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--fg-4)]">
        Palantir view
      </p>
      <h1 className="mt-2 font-serif text-3xl font-normal text-[var(--fg-1)] md:text-[40px]">
        Entity graph
      </h1>
      <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-[var(--fg-3)]">
        Seed with <code className="font-mono text-[var(--fg-2)]">?entity=&lt;uuid&gt;</code> from a dossier, or open
        the Graph tab on an official. Click nodes to pull adjacent accepted edges.
      </p>
      <div className="mt-8">
        <EntityGraph key={entity ?? "none"} rootEntityId={entity} />
      </div>
    </div>
  );
}
