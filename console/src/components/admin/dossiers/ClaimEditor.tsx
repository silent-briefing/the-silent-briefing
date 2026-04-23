"use client";

import { useAuth } from "@clerk/nextjs";
import * as React from "react";
import { toast } from "sonner";

import { MutationConfirm } from "@/components/admin/MutationConfirm";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BffHttpError, bffJson } from "@/lib/bff/client";
import { type ClaimDetail, claimDetailSchema } from "@/lib/schemas/admin-dossier";
import { cn } from "@/lib/utils";

export type ClaimEditorProps = {
  claim: ClaimDetail;
  onUpdated: () => void;
  className?: string;
};

function detailFromError(body: unknown): string {
  if (body && typeof body === "object" && "detail" in body) {
    const d = (body as { detail?: unknown }).detail;
    if (typeof d === "string") return d;
  }
  return "Request failed";
}

export function ClaimEditor(props: ClaimEditorProps) {
  return <ClaimEditorInner key={props.claim.id} {...props} />;
}

function ClaimEditorInner({ claim, onUpdated, className }: ClaimEditorProps) {
  const { getToken } = useAuth();
  const [text, setText] = React.useState(claim.claim_text);
  const [sourceUrl, setSourceUrl] = React.useState(claim.source_url ?? "");
  const [published, setPublished] = React.useState(claim.published);
  const [needsReview, setNeedsReview] = React.useState(claim.requires_human_review);
  const [busy, setBusy] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectNote, setRejectNote] = React.useState("");

  const save = async () => {
    setBusy(true);
    try {
      await bffJson({
        path: `/v1/admin/dossiers/claim/${claim.id}`,
        method: "PATCH",
        body: {
          claim_text: text,
          source_url: sourceUrl || null,
          published,
          requires_human_review: needsReview,
        },
        getToken: () => getToken(),
        schema: claimDetailSchema,
      });
      toast.success("Claim saved");
      onUpdated();
    } catch (e) {
      toast.error(e instanceof BffHttpError ? detailFromError(e.body) : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!rejectNote.trim()) {
      toast.error("Add a review note before rejecting.");
      throw new Error("review_note required");
    }
    setBusy(true);
    try {
      await bffJson({
        path: `/v1/admin/dossiers/claim/${claim.id}/reject`,
        method: "POST",
        body: { review_note: rejectNote.trim() },
        getToken: () => getToken(),
        schema: claimDetailSchema,
      });
      toast.success("Claim rejected / noted");
      setRejectOpen(false);
      setRejectNote("");
      onUpdated();
    } catch (e) {
      toast.error(e instanceof BffHttpError ? detailFromError(e.body) : "Reject failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "space-y-4 rounded-[var(--radius-lg)] border border-[rgba(0,15,34,0.08)] bg-surface p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--fg-4)]">
          {claim.category} · {claim.pipeline_stage}
        </p>
        {claim.review_note ? (
          <p className="max-w-prose font-sans text-xs text-[var(--secondary)]">Note: {claim.review_note}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`ct-${claim.id}`}>Claim text</Label>
        <Textarea
          id={`ct-${claim.id}`}
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="border-[rgba(0,15,34,0.12)] bg-surface font-sans text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`su-${claim.id}`}>Source URL</Label>
        <Input
          id={`su-${claim.id}`}
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className="border-[rgba(0,15,34,0.12)] bg-surface"
        />
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 font-sans text-sm text-[var(--fg-2)]">
          <Checkbox checked={published} onCheckedChange={(c) => setPublished(c === true)} id={`pub-${claim.id}`} />
          Published
        </label>
        <label className="flex items-center gap-2 font-sans text-sm text-[var(--fg-2)]">
          <Checkbox
            checked={needsReview}
            onCheckedChange={(c) => setNeedsReview(c === true)}
            id={`rev-${claim.id}`}
          />
          Needs human review
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => void save()} disabled={busy}>
          Save changes
        </Button>
        <Button type="button" size="sm" variant="destructive" onClick={() => setRejectOpen(true)} disabled={busy}>
          Reject with note
        </Button>
      </div>

      <MutationConfirm
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject this claim?"
        description={
          <div className="space-y-2">
            <p className="text-sm text-[var(--fg-3)]">Sets published to false and stores your note on the row.</p>
            <Textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Why this claim is not acceptable…"
              rows={3}
              className="border-[rgba(0,15,34,0.12)] bg-surface"
            />
          </div>
        }
        confirmLabel="Reject"
        onConfirm={reject}
        pending={busy}
      />
    </div>
  );
}
