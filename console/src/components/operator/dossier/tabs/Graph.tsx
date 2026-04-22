"use client";

import { EntityGraph } from "@/components/operator/graph/EntityGraph";

export type GraphPanelProps = {
  officialId: string;
  entityId: string | null | undefined;
  fetchEnabled: boolean;
};

export function GraphPanel({ officialId, entityId, fetchEnabled }: GraphPanelProps) {
  if (!fetchEnabled) return null;

  return (
    <section aria-label="Entity graph">
      <EntityGraph key={`${officialId}:${entityId ?? ""}`} rootEntityId={entityId ?? null} />
    </section>
  );
}
