"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type MutationConfirmProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  /** When true, confirm button shows a busy state. */
  pending?: boolean;
};

/**
 * Destructive admin action confirm — crimson accent per design (signal-only `--secondary`).
 */
export function MutationConfirm({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  pending = false,
}: MutationConfirmProps) {
  const [internalPending, setInternalPending] = React.useState(false);
  const busy = pending || internalPending;

  const handleConfirm = async () => {
    setInternalPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setInternalPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!busy}
        className={cn(
          "sm:max-w-md",
          "ring-2 ring-[var(--secondary)]/20",
          "border border-[var(--secondary)]/35",
        )}
      >
        <DialogHeader>
          <DialogTitle className="font-sans text-base font-semibold text-[var(--secondary)]">
            {title}
          </DialogTitle>
          <DialogDescription className="font-sans text-sm leading-relaxed text-[var(--fg-3)]">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-t border-[rgba(0,15,34,0.06)] bg-transparent sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            className="bg-[var(--secondary)]/15 text-[var(--secondary)] hover:bg-[var(--secondary)]/25"
            onClick={() => void handleConfirm()}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
