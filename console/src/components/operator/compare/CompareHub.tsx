"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/operator/EmptyState";
import { computeSharedSlugPairs } from "@/lib/queries/compare-graph";
import {
  compareSlugsToSearchParams,
  MAX_COMPARE_OFFICIALS,
  MIN_COMPARE_OFFICIALS,
  parseCompareSlugs,
} from "@/lib/queries/compare-slugs";
import { getBySlugs } from "@/lib/queries/officials";
import { listJurisdictionOptions } from "@/lib/queries/jurisdictions";
import { useSupabaseBrowser } from "@/lib/supabase/browser";

import { CompareMatrix } from "./CompareMatrix";
import { ComparePicker } from "./ComparePicker";

const EMPTY_SHARED_PAIRS = new Set<string>();

export function CompareHub() {
  const router = useRouter();
  const raw = useSearchParams();
  const spKey = raw.toString();
  const slugs = React.useMemo(() => parseCompareSlugs(new URLSearchParams(spKey)), [spKey]);

  const supabase = useSupabaseBrowser();
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [draftSlugs, setDraftSlugs] = React.useState<string[]>([]);

  const openPicker = React.useCallback(() => {
    setDraftSlugs(parseCompareSlugs(new URLSearchParams(spKey)));
    setPickerOpen(true);
  }, [spKey]);

  const onToggleSlug = React.useCallback((slug: string) => {
    setDraftSlugs((prev) => {
      const i = prev.indexOf(slug);
      if (i >= 0) return prev.filter((s) => s !== slug);
      if (prev.length >= MAX_COMPARE_OFFICIALS) return prev;
      return [...prev, slug];
    });
  }, []);

  const applyPicker = React.useCallback(() => {
    const sp = compareSlugsToSearchParams(draftSlugs);
    const q = sp.toString();
    router.replace(q ? `/compare?${q}` : "/compare", { scroll: false });
    setPickerOpen(false);
  }, [draftSlugs, router]);

  const { data: officials = [], isPending, isError, error } = useQuery({
    queryKey: ["compare-officials", slugs.join(",")],
    queryFn: () => getBySlugs(supabase, slugs),
    enabled: slugs.length >= MIN_COMPARE_OFFICIALS,
  });

  const { data: jurisdictions = [] } = useQuery({
    queryKey: ["jurisdiction-options"],
    queryFn: () => listJurisdictionOptions(supabase),
  });

  const jurisdictionLabels = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const j of jurisdictions) m.set(j.id, j.name);
    return m;
  }, [jurisdictions]);

  const { data: sharedPairs } = useQuery({
    queryKey: ["compare-shared", officials.map((o) => o.id).join(",")],
    queryFn: () => computeSharedSlugPairs(supabase, officials),
    enabled: officials.length >= MIN_COMPARE_OFFICIALS,
  });
  const shared = sharedPairs ?? EMPTY_SHARED_PAIRS;

  const missingCount =
    slugs.length >= MIN_COMPARE_OFFICIALS ? slugs.length - officials.length : 0;

  return (
    <div>
      <nav className="compare-no-print font-sans text-xs text-[var(--fg-4)]">
        <Link href="/" className="hover:text-[var(--fg-2)]">
          Briefing
        </Link>
        <span className="mx-2 text-[var(--fg-4)]">·</span>
        <span className="text-[var(--fg-3)]">Compare</span>
      </nav>
      <p className="compare-no-print mt-4 font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--fg-4)]">
        Matrix
      </p>
      <h1 className="mt-2 font-serif text-3xl font-normal text-[var(--fg-1)] md:text-[40px]">
        Comparison
      </h1>
      <p className="compare-no-print mt-3 max-w-2xl font-sans text-sm leading-relaxed text-[var(--fg-3)]">
        Select two to four officials. Panels gain a gold pinstripe when a pair shares a direct{" "}
        <strong className="font-semibold text-[var(--fg-2)]">accepted</strong> entity edge. Print or save as PDF from
        the browser.
      </p>

      <div className="compare-no-print mt-8 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={openPicker}>
          {slugs.length >= MIN_COMPARE_OFFICIALS ? "Edit selection" : "Choose officials"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-[rgba(212,175,55,0.35)]"
          onClick={() => globalThis.print?.()}
          disabled={officials.length < MIN_COMPARE_OFFICIALS}
        >
          Print / PDF
        </Button>
        {slugs.length > 0 ? (
          <span className="font-mono text-xs text-[var(--fg-4)]">{slugs.join(", ")}</span>
        ) : null}
      </div>

      <ComparePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        draftOrder={draftSlugs}
        onToggleSlug={onToggleSlug}
        onApply={applyPicker}
        maxPick={MAX_COMPARE_OFFICIALS}
      />

      <div className="mt-10">
        {slugs.length < MIN_COMPARE_OFFICIALS ? (
          <EmptyState>
            <p className="font-sans text-sm text-[var(--fg-3)]">
              Pick at least {MIN_COMPARE_OFFICIALS} officials to compare (up to {MAX_COMPARE_OFFICIALS}).
            </p>
            <Button type="button" className="mt-4" onClick={openPicker}>
              Choose officials
            </Button>
          </EmptyState>
        ) : isPending ? (
          <p className="font-serif text-base italic text-[var(--fg-3)]" aria-busy="true">
            Loading profiles…
          </p>
        ) : isError ? (
          <EmptyState role="alert">
            <p className="font-sans text-sm text-[var(--fg-3)]">
              {error instanceof Error ? error.message : "Could not load officials"}
            </p>
          </EmptyState>
        ) : missingCount > 0 ? (
          <EmptyState role="alert">
            <p className="font-sans text-sm text-[var(--fg-3)]">
              {missingCount} slug(s) not found — check spelling or remove them from the URL.
            </p>
          </EmptyState>
        ) : (
          <CompareMatrix
            officials={officials}
            jurisdictionLabels={jurisdictionLabels}
            sharedPairs={shared}
          />
        )}
      </div>
    </div>
  );
}
