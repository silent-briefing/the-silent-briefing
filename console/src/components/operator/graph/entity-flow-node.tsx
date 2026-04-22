"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type EntityFlowNodeData = Record<string, unknown> & {
  label: string;
  subtitle: string;
};

export type EntityFlowNodeType = Node<EntityFlowNodeData, "entity">;

export function EntityFlowNode({ data }: NodeProps<EntityFlowNodeType>) {
  return (
    <div className="min-w-[148px] max-w-[220px] rounded-[var(--radius-md)] bg-surface-1 px-3 py-2 shadow-[var(--shadow-sm)]">
      <Handle
        type="target"
        position={Position.Top}
        className="!size-2 !border-0 !bg-[var(--tertiary)]"
        aria-label="Incoming"
      />
      <p className="font-serif text-sm leading-snug text-[var(--fg-1)]">{data.label}</p>
      <p className="mt-1 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--fg-4)]">
        {data.subtitle}
      </p>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-2 !border-0 !bg-[var(--tertiary)]"
        aria-label="Outgoing"
      />
    </div>
  );
}
