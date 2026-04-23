import { Suspense } from "react";
import Link from "next/link";

import { FeedsConfigClient } from "@/components/admin/feeds/FeedsConfigClient";

export default function AdminFeedsPage() {
  return (
    <div>
      <p className="font-sans text-sm uppercase tracking-[0.2em] text-[var(--fg-4)]">Admin</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-primary">Feeds configuration</h1>
      <p className="mt-3 max-w-prose font-sans text-sm leading-relaxed text-[var(--fg-3)]">
        X and Perplexity surfaces for the operator briefing; cache TTL and per-official opt-outs live in the{" "}
        <span className="font-mono">operator_feeds</span> settings document.
      </p>
      <p className="mt-4 font-sans text-sm">
        <Link href="/admin/sources" className="text-primary underline-offset-4 hover:underline">
          ← Source URLs
        </Link>
      </p>
      <Suspense fallback={<p className="mt-10 font-sans text-sm text-[var(--fg-3)]">Loading…</p>}>
        <FeedsConfigClient className="mt-10" />
      </Suspense>
    </div>
  );
}
