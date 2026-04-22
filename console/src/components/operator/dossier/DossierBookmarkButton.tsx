"use client";

import { useAuth, useOrganization } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { RoleGate } from "@/components/auth/RoleGate";
import { createSavedView } from "@/lib/queries/saved-views";
import { useSupabaseBrowser } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

export type DossierBookmarkButtonProps = {
  slug: string;
  officeType: string;
  fullName: string;
  className?: string;
};

export function DossierBookmarkButton({ slug, officeType, fullName, className }: DossierBookmarkButtonProps) {
  const supabase = useSupabaseBrowser();
  const { userId } = useAuth();
  const { organization } = useOrganization();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sign in required");
      const orgId = organization?.id ?? `personal_${userId}`;
      return createSavedView(supabase, {
        userId,
        orgId,
        name: `${fullName} — dossier`,
        kind: "dossier",
        query: { slug, officeType },
      });
    },
    onSuccess: () => {
      toast.success("Bookmark saved");
      void qc.invalidateQueries({ queryKey: ["user-saved-views"] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Could not save bookmark";
      toast.error(msg);
    },
  });

  return (
    <RoleGate required="operator">
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !userId}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-[rgba(212,175,55,0.35)] px-3 py-2",
          "font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-tertiary",
          "transition-colors hover:bg-[rgba(212,175,55,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4",
          "disabled:opacity-50",
          className,
        )}
      >
        <Bookmark className="size-4" strokeWidth={1.5} aria-hidden />
        Bookmark
      </button>
    </RoleGate>
  );
}
