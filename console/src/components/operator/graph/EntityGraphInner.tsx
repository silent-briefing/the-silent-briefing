"use client";

import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { EmptyState } from "@/components/operator/EmptyState";
import { loadEntityGraphSnapshot } from "@/lib/queries/graph";
import { useSupabaseBrowser } from "@/lib/supabase/browser";

import { EntityFlowNode, type EntityFlowNodeData, type EntityFlowNodeType } from "./entity-flow-node";
import { bfsLayers, radialPositionsFromLayers, undirectedAdjacency } from "./entity-graph-layout";

import "@xyflow/react/dist/style.css";

const nodeTypes = { entity: EntityFlowNode };

function edgePaint(confidence: number | null | undefined): { stroke: string; strokeWidth: number } {
  const c = confidence ?? 0;
  return {
    stroke: c >= 0.8 ? "var(--tertiary)" : "rgba(0,15,34,0.42)",
    strokeWidth: 1 + Math.min(3, c * 3),
  };
}

function FitViewOnGraph({ keys }: { keys: string }) {
  const { fitView } = useReactFlow();
  React.useEffect(() => {
    queueMicrotask(() => fitView({ padding: 0.15, duration: 200 }));
  }, [keys, fitView]);
  return null;
}

export type EntityGraphInnerProps = {
  rootEntityId: string | null;
  className?: string;
};

function EntityGraphCanvas({ rootEntityId, className }: EntityGraphInnerProps) {
  const supabase = useSupabaseBrowser();
  const [fetchRoots, setFetchRoots] = React.useState<Set<string>>(
    () => new Set(rootEntityId ? [rootEntityId] : []),
  );

  const rootsKey = [...fetchRoots].sort().join(",");

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["entity-graph", rootEntityId, rootsKey],
    queryFn: () => loadEntityGraphSnapshot(supabase, rootEntityId!, fetchRoots),
    enabled: Boolean(rootEntityId) && fetchRoots.size > 0,
  });

  const onNodeClick = React.useCallback((_: React.MouseEvent, node: Node<EntityFlowNodeData, "entity">) => {
    setFetchRoots((prev) => {
      const next = new Set(prev);
      next.add(node.id);
      return next;
    });
  }, []);

  const reducedMotion = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const { nodes, edges, layoutKey } = React.useMemo(() => {
    if (!rootEntityId || !data) {
      return { nodes: [] as EntityFlowNodeType[], edges: [] as Edge[], layoutKey: "" };
    }
    const pairs = data.edges.map((e) => ({ a: e.source_entity_id, b: e.target_entity_id }));
    const adj = undirectedAdjacency(pairs);
    const layers = bfsLayers(rootEntityId, adj);
    const pos = radialPositionsFromLayers(layers, { cx: 320, cy: 260, radiusStep: 140 });

    const nodes: EntityFlowNodeType[] = data.entities.map((e) => {
      const p = pos.get(e.id) ?? { x: 320, y: 260 };
      return {
        id: e.id,
        type: "entity",
        position: p,
        data: { label: e.canonical_name, subtitle: e.type.replaceAll("_", " ") },
      };
    });

    const edges: Edge[] = data.edges.map((e) => {
      const { stroke, strokeWidth } = edgePaint(e.confidence);
      return {
        id: e.id,
        source: e.source_entity_id,
        target: e.target_entity_id,
        label: e.relation,
        animated: !reducedMotion && (e.confidence ?? 0) >= 0.85,
        style: { stroke, strokeWidth },
        markerEnd: { type: MarkerType.ArrowClosed, color: stroke, width: 12, height: 12 },
        labelStyle: { fill: "rgba(250,248,242,0.85)", fontSize: 10 },
        labelBgStyle: { fill: "rgba(0,15,34,0.55)" },
      };
    });

    return { nodes, edges, layoutKey: `${rootsKey}:${nodes.length}:${edges.length}` };
  }, [data, reducedMotion, rootEntityId, rootsKey]);

  if (!rootEntityId) {
    return (
      <p className="font-sans text-sm text-[var(--fg-3)]">
        No entity is linked to this official yet — graph will populate once the entity graph is wired.
      </p>
    );
  }

  if (isPending) {
    return (
      <p className="font-serif text-base italic text-[var(--fg-3)]" aria-busy="true">
        Loading graph…
      </p>
    );
  }

  if (isError) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return (
      <EmptyState role="alert">
        <p className="font-sans text-sm text-[var(--fg-3)]">Could not load graph: {msg}</p>
      </EmptyState>
    );
  }

  if (nodes.length === 0) {
    return (
      <p className="font-sans text-sm text-[var(--fg-3)]">
        No accepted edges yet — click other dossiers or wait for correlations to publish.
      </p>
    );
  }

  return (
    <div
      className={`h-[min(520px,70vh)] w-full overflow-hidden rounded-[var(--radius-lg)] bg-primary shadow-[var(--shadow-md)] ${className ?? ""}`}
      data-testid="graph-canvas"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        nodesDraggable={!reducedMotion}
        nodesConnectable={false}
        elementsSelectable
        fitView
        proOptions={{ hideAttribution: true }}
        className="!bg-primary"
      >
        <Background color="rgba(212,175,55,0.12)" gap={20} />
        <Controls className="!bg-surface-1 !text-[var(--fg-1)] !border-[rgba(212,175,55,0.2)]" />
        <MiniMap
          className="!bg-surface-1/90 !border-[rgba(212,175,55,0.25)]"
          nodeStrokeColor="var(--tertiary)"
          maskColor="rgba(0,15,34,0.35)"
        />
        <FitViewOnGraph keys={layoutKey} />
      </ReactFlow>
    </div>
  );
}

export function EntityGraphInner(props: EntityGraphInnerProps) {
  return (
    <ReactFlowProvider>
      <EntityGraphCanvas {...props} />
    </ReactFlowProvider>
  );
}
