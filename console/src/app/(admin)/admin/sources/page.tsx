import { Suspense } from "react";
import Link from "next/link";

import { SourcesListClient } from "@/components/admin/sources/SourcesListClient";

export default function AdminSourcesPage() {
  return (
    <div>
      <p className="font-sans text-sm uppercase tracking-[0.2em] text-[var(--fg-4)]">Admin</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-primary">Source URLs</h1>
      <p className="mt-3 max-w-prose font-sans text-sm leading-relaxed text-[var(--fg-3)]">
        Scrapers and civic API endpoints read from <span className="font-mono">public.settings</span> when set;
        otherwise from environment / shipped defaults (see <span className="font-mono">briefing.config.Settings</span>
        ).
      </p>
      <p className="mt-4 font-sans text-sm">
        <Link href="/admin/feeds" className="text-primary underline-offset-4 hover:underline">
          Operator feeds (X + Perplexity) →
        </Link>
      </p>
      <Suspense fallback={<p className="mt-10 font-sans text-sm text-[var(--fg-3)]">Loading…</p>}>
        <SourcesListClient className="mt-10" />
      </Suspense>
    </div>
  );
}
