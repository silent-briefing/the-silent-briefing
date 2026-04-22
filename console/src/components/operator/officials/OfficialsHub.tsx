"use client";

import { useAuth, useOrganization } from "@clerk/nextjs";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/operator/EmptyState";
import { createSavedView } from "@/lib/queries/saved-views";
import { listJurisdictionOptions } from "@/lib/queries/jurisdictions";
import { listOfficialsFiltered } from "@/lib/queries/officials";
import {
  officialsFiltersFromSearchParams,
  officialsFiltersToSearchParams,
  type OfficialsUrlFilters,
} from "@/lib/queries/officials-url-filters";
import { useSupabaseBrowser } from "@/lib/supabase/browser";

import { OfficialsFilters, OfficialsSaveViewBar } from "./OfficialsFilters";
import { OfficialsTable } from "./OfficialsTable";

export function OfficialsHub() {
  const router = useRouter();
  const rawSearchParams = useSearchParams();
  const spKey = rawSearchParams.toString();
  const filters = React.useMemo(
    () => officialsFiltersFromSearchParams(new URLSearchParams(spKey)),
    [spKey],
  );

  const setFilters = React.useCallback(
    (next: OfficialsUrlFilters) => {
      const sp = officialsFiltersToSearchParams(next);
      router.replace(`/officials?${sp.toString()}`, { scroll: false });
    },
    [router],
  );

  const supabase = useSupabaseBrowser();
  const { userId } = useAuth();
  const { organization } = useOrganization();

  const { data: jurisdictions = [] } = useQuery({
    queryKey: ["jurisdiction-options"],
    queryFn: () => listJurisdictionOptions(supabase),
  });

  const {
    data: rows = [],
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["officials-filtered", filters],
    queryFn: () => listOfficialsFiltered(supabase, filters),
  });

  const jurisdictionLabels = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const j of jurisdictions) m.set(j.id, j.name);
    return m;
  }, [jurisdictions]);

  const [saveName, setSaveName] = React.useState("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sign in required");
      const orgId = organization?.id ?? `personal_${userId}`;
      return createSavedView(supabase, {
        userId,
        orgId,
        name: saveName.trim(),
        kind: "officials",
        query: {
          jurisdictionId: filters.jurisdictionId,
          officeType: filters.officeType,
          party: filters.party,
          subjectAlignment: filters.subjectAlignment,
          isCurrent: filters.isCurrent,
        },
      });
    },
    onSuccess: () => {
      toast.success("Saved view stored");
      setSaveName("");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast.error(msg);
    },
  });

  return (
    <div>
      <nav className="font-sans text-xs text-[var(--fg-4)]">
        <Link href="/" className="hover:text-[var(--fg-2)]">
          Briefing
        </Link>
        <span className="mx-2 text-[var(--fg-4)]">·</span>
        <span className="text-[var(--fg-3)]">Officials</span>
      </nav>
      <p className="mt-4 font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--fg-4)]">
        Roster
      </p>
      <h1 className="mt-2 font-serif text-3xl font-normal text-[var(--fg-1)] md:text-[40px]">
        Officials
      </h1>
      <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-[var(--fg-3)]">
        Filter by jurisdiction ladder, office, party, and alignment. Row opens the dossier. Saved views require a
        Clerk <span className="font-mono text-[var(--fg-2)]">supabase</span> JWT (authenticated RLS).
      </p>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <OfficialsFilters jurisdictions={jurisdictions} value={filters} onChange={setFilters} />
        </div>
        <div className="space-y-6 lg:col-span-8">
          <OfficialsSaveViewBar
            viewName={saveName}
            onViewNameChange={setSaveName}
            onSave={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          />
          {isPending ? (
            <p className="font-serif text-base italic text-[var(--fg-3)]" aria-busy="true">
              Loading officials…
            </p>
          ) : isError ? (
            <EmptyState role="alert">
              <p className="font-sans text-sm text-[var(--fg-3)]">
                {error instanceof Error ? error.message : "Could not load officials"}
              </p>
            </EmptyState>
          ) : (
            <OfficialsTable rows={rows} jurisdictionLabels={jurisdictionLabels} />
          )}
        </div>
      </div>
    </div>
  );
}
