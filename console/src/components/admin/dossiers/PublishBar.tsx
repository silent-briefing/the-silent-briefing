"use client";

import { useAuth } from "@clerk/nextjs";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";

import { MutationConfirm } from "@/components/admin/MutationConfirm";
import { Button } from "@/components/ui/button";
import { BffHttpError, bffJson } from "@/lib/bff/client";
import { claimDetailSchema } from "@/lib/schemas/admin-dossier";

const publishResponseSchema = z.array(claimDetailSchema);

export type PublishBarProps = {
  selectedIds: string[];
  onPublished: () => void;
};

function detailFromError(body: unknown): string {
  if (body && typeof body === "object" && "detail" in body) {
    const d = (body as { detail?: unknown }).detail;
    if (typeof d === "string") return d;
  }
  return "Request failed";
}

export function PublishBar({ selectedIds, onPublished }: PublishBarProps) {
  const { getToken } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const publish = async () => {
    setPending(true);
    try {
      await bffJson({
        path: "/v1/admin/dossiers/publish",
        method: "POST",
        body: { claim_ids: selectedIds },
        getToken: () => getToken(),
        schema: publishResponseSchema,
      });
      toast.success(`Published ${selectedIds.length} claim(s)`);
      setOpen(false);
      onPublished();
    } catch (e) {
      toast.error(e instanceof BffHttpError ? detailFromError(e.body) : "Publish failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={selectedIds.length === 0}
        onClick={() => setOpen(true)}
      >
        Publish selected ({selectedIds.length})
      </Button>
      <MutationConfirm
        open={open}
        onOpenChange={setOpen}
        title="Publish selected claims?"
        description="Marks them published, records you as reviewer, and clears the review queue flag."
        confirmLabel="Publish"
        onConfirm={publish}
        pending={pending}
      />
    </div>
  );
}
