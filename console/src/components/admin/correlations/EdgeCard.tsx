"use client";

import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { BffHttpError, bffJson } from "@/lib/bff/client";
import {
  ADMIN_CORRELATIONS_QUERY_PREFIX,
  type ProposedEdgeItem,
} from "@/lib/schemas/admin-correlations";
import { cn } from "@/lib/utils";

const edgeActionResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  escalated: z.boolean().optional(),
});

function detailFromError(body: unknown): string {
  if (body && typeof body === "object" && "detail" in body) {
    const d = (body as { detail?: unknown }).detail;
    if (typeof d === "string") return d;
  }
  return "Request failed";
}

export function EdgeCard({ edge, className }: { edge: ProposedEdgeItem; className?: string }) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState<string | null>(null);

  const invalidate = () => void qc.invalidateQueries({ queryKey: [ADMIN_CORRELATIONS_QUERY_PREFIX] });

  const run = async (path: string, label: string) => {
    setBusy(label);
    try {
      await bffJson({
        path,
        method: "POST",
        getToken: () => getToken(),
        schema: edgeActionResponseSchema,
      });
      toast.success(`${label} ok`);
      invalidate();
    } catch (e) {
      toast.error(e instanceof BffHttpError ? detailFromError(e.body) : `${label} failed`);
    } finally {
      setBusy(null);
    }
  };

  const escalated = edge.provenance?.escalated === true;

  return (
    <article
      className={cn(
        "rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-[var(--shadow-sm)]",
        escalated ? "ring-1 ring-[var(--tertiary)]/40" : "",
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--fg-4)]">
          {edge.id.slice(0, 8)}… · conf {edge.confidence != null ? edge.confidence.toFixed(2) : "—"}
        </p>
        {escalated ? (
          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">
            Escalated
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-sans text-sm leading-relaxed text-primary">
        <span className="font-semibold">{edge.source.canonical_name}</span>
        <span className="mx-2 font-mono text-[var(--fg-3)]">—[{edge.relation}]→</span>
        <span className="font-semibold">{edge.target.canonical_name}</span>
      </p>
      <pre className="mt-3 max-h-28 overflow-auto rounded-md bg-[var(--surface-2)] p-2 font-mono text-[10px] text-[var(--fg-3)]">
        {JSON.stringify(edge.provenance, null, 2)}
      </pre>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy != null}
          onClick={() => run(`/v1/admin/correlations/${edge.id}/accept`, "Accept")}
        >
          {busy === "Accept" ? "…" : "Accept"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy != null}
          onClick={() => run(`/v1/admin/correlations/${edge.id}/reject`, "Reject")}
        >
          {busy === "Reject" ? "…" : "Reject"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy != null || escalated}
          onClick={() => run(`/v1/admin/correlations/${edge.id}/escalate`, "Escalate")}
        >
          {busy === "Escalate" ? "…" : "Escalate"}
        </Button>
      </div>
    </article>
  );
}
