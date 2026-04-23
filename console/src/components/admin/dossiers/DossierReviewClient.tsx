"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { bffJson } from "@/lib/bff/client";
import { officialDossierResponseSchema } from "@/lib/schemas/admin-dossier";
import { cn } from "@/lib/utils";

import { ClaimEditor } from "./ClaimEditor";
import { CritiquePanel } from "./CritiquePanel";
import { GroundednessMeter } from "./GroundednessMeter";
import { PublishBar } from "./PublishBar";

export function DossierReviewClient({
  officialId,
  className,
}: {
  officialId: string;
  className?: string;
}) {
  const { getToken } = useAuth();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const claimParam = searchParams.get("claim");

  const dossierQuery = useQuery({
    queryKey: ["admin-dossier-official", officialId],
    queryFn: () =>
      bffJson({
        path: `/v1/admin/dossiers/official/${officialId}`,
        getToken: () => getToken(),
        schema: officialDossierResponseSchema,
      }),
  });

  const claims = React.useMemo(
    () => dossierQuery.data?.claims ?? [],
    [dossierQuery.data],
  );
  const [userPick, setUserPick] = React.useState<string | null>(null);
  const [bulk, setBulk] = React.useState<Set<string>>(() => new Set());

  const activeClaimId = React.useMemo(() => {
    if (claims.length === 0) return null;
    if (userPick && claims.some((c) => c.id === userPick)) return userPick;
    if (claimParam && claims.some((c) => c.id === claimParam)) return claimParam;
    return claims[0]!.id;
  }, [claims, claimParam, userPick]);

  const selected = claims.find((c) => c.id === activeClaimId) ?? null;

  const toggleBulk = (id: string, on: boolean) => {
    setBulk((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin-dossier-official", officialId] });

  return (
    <div className={cn("space-y-8", className)}>
      {dossierQuery.data ? (
        <div>
          <h1 className="font-serif text-2xl font-semibold text-primary">{dossierQuery.data.official.full_name}</h1>
          <p className="mt-1 font-mono text-sm text-[var(--fg-3)]">{dossierQuery.data.official.slug}</p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PublishBar selectedIds={[...bulk]} onPublished={invalidate} />
        <Link href="/admin/dossiers" className="font-sans text-sm text-primary underline-offset-4 hover:underline">
          ← Queue
        </Link>
      </div>

      {dossierQuery.isLoading ? (
        <p className="font-sans text-sm text-[var(--fg-3)]">Loading dossier…</p>
      ) : dossierQuery.isError ? (
        <p className="font-sans text-sm text-destructive">Could not load dossier.</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <GroundednessMeter score={selected?.groundedness_score ?? null} />
            <div className="space-y-2">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--fg-4)]">
                Claims
              </p>
              <ul className="space-y-2">
                {claims.map((c) => (
                  <li
                    key={c.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border border-[rgba(0,15,34,0.08)] p-3",
                      activeClaimId === c.id ? "bg-surface-1" : "bg-surface",
                    )}
                  >
                    <Checkbox
                      checked={bulk.has(c.id)}
                      onCheckedChange={(v) => toggleBulk(c.id, v === true)}
                      aria-label={`Select ${c.category}`}
                    />
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left font-sans text-sm text-[var(--fg-2)]"
                      onClick={() => setUserPick(c.id)}
                    >
                      <span className="block truncate font-medium text-[var(--fg-1)]">{c.category}</span>
                      <span className="mt-1 line-clamp-2 text-[var(--fg-3)]">{c.claim_text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {selected ? <ClaimEditor claim={selected} onUpdated={invalidate} /> : null}
          </div>
          <CritiquePanel claim={selected} />
        </div>
      )}
    </div>
  );
}
