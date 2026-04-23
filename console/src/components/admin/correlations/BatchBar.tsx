"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import { MutationConfirm } from "@/components/admin/MutationConfirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BffHttpError, bffJson } from "@/lib/bff/client";
import {
  ADMIN_CORRELATIONS_QUERY_PREFIX,
  batchAcceptResponseSchema,
} from "@/lib/schemas/admin-correlations";

function detailFromError(body: unknown): string {
  if (body && typeof body === "object" && "detail" in body) {
    const d = (body as { detail?: unknown }).detail;
    if (typeof d === "string") return d;
  }
  return "Request failed";
}

export function BatchBar() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [threshold, setThreshold] = React.useState("0.85");

  const mut = useMutation({
    mutationFn: async (min_confidence: number) =>
      bffJson({
        path: "/v1/admin/correlations/batch-accept",
        method: "POST",
        body: { min_confidence },
        getToken: () => getToken(),
        schema: batchAcceptResponseSchema,
      }),
    onSuccess: (data) => {
      toast.success(`Accepted ${data.updated} edge(s)`);
      void qc.invalidateQueries({ queryKey: [ADMIN_CORRELATIONS_QUERY_PREFIX] });
      setOpen(false);
    },
    onError: (e: unknown) => {
      toast.error(e instanceof BffHttpError ? detailFromError(e.body) : "Batch accept failed");
    },
  });

  const onConfirm = async () => {
    const v = Number.parseFloat(threshold);
    if (Number.isNaN(v) || v < 0 || v > 1) {
      toast.error("Threshold must be a number between 0 and 1");
      return;
    }
    await mut.mutateAsync(v);
  };

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">
          Batch accept min confidence
        </Label>
        <Input
          className="w-28 font-mono text-sm"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          inputMode="decimal"
          aria-label="Minimum confidence for batch accept"
        />
      </div>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Accept all ≥ threshold
      </Button>
      <MutationConfirm
        open={open}
        onOpenChange={setOpen}
        title="Batch-accept proposed edges?"
        description={
          <span>
            Accepts every <strong className="text-primary">proposed</strong> edge whose confidence is at least{" "}
            <strong className="font-mono text-primary">{threshold}</strong>. This cannot be undone from the UI (status
            becomes accepted). Confirm the threshold matches your intent.
          </span>
        }
        confirmLabel="Accept batch"
        onConfirm={onConfirm}
        pending={mut.isPending}
      />
    </div>
  );
}
