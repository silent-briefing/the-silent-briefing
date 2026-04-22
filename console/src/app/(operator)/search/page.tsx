import Link from "next/link";
import { Suspense } from "react";

import type { SemanticSearchHit } from "@/lib/queries/schemas";
import { searchLexicalAll, type LexicalSearchHit } from "@/lib/search/lexical";
import { runSemanticSearch } from "@/lib/search/semantic";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const SEMANTIC_FLAG = process.env.NEXT_PUBLIC_SEARCH_SEMANTIC !== "0";

const KIND_ORDER: LexicalSearchHit["kind"][] = ["official", "bill", "opinion", "media"];

function groupLexical(rows: LexicalSearchHit[]) {
  const m = new Map<LexicalSearchHit["kind"], LexicalSearchHit[]>();
  for (const r of rows) {
    const arr = m.get(r.kind) ?? [];
    arr.push(r);
    m.set(r.kind, arr);
  }
  return m;
}

function sectionTitle(kind: LexicalSearchHit["kind"]) {
  switch (kind) {
    case "official":
      return "Officials";
    case "bill":
      return "Bills";
    case "opinion":
      return "Opinions";
    case "media":
      return "Media";
  }
}

const hitLinkClass = cn(
  "block rounded-[var(--radius-md)] px-3 py-2 transition-colors",
  "hover:bg-[rgba(0,15,34,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4",
);

async function SearchBody({ q }: { q: string }) {
  const supabase = await createServerSupabaseClient();
  const lexical = await searchLexicalAll(supabase, q, { limitPerKind: 25 });
  const grouped = groupLexical(lexical);

  let semantic: { results: SemanticSearchHit[]; semantic_available?: boolean } = {
    results: [],
    semantic_available: undefined,
  };
  if (SEMANTIC_FLAG) {
    try {
      semantic = await runSemanticSearch(q);
    } catch {
      semantic = { results: [], semantic_available: false };
    }
  }

  const anyLexical = lexical.length > 0;

  return (
    <div className="mt-10 space-y-12">
      {!anyLexical ? (
        <p className="font-serif text-base italic text-[var(--fg-3)]">No lexical matches in catalog tables.</p>
      ) : null}
      {KIND_ORDER.map((kind) => {
        const items = grouped.get(kind);
        if (!items?.length) return null;
        return (
          <section key={kind} aria-labelledby={`search-${kind}`}>
            <h2
              id={`search-${kind}`}
              className="font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--fg-4)]"
            >
              {sectionTitle(kind)}
            </h2>
            <ul className="mt-4 divide-y divide-[rgba(0,15,34,0.06)]">
              {items.map((hit) => (
                <li key={`${kind}-${hit.id}`} className="py-1">
                  {hit.href.startsWith("http") ? (
                    <a
                      href={hit.href}
                      className={cn(hitLinkClass, "font-sans text-sm text-[var(--fg-1)]")}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="block">{hit.title}</span>
                      {hit.subtitle ? (
                        <span className="mt-0.5 block font-sans text-xs text-[var(--fg-4)]">
                          {hit.subtitle}
                        </span>
                      ) : null}
                    </a>
                  ) : (
                    <Link href={hit.href} className={cn(hitLinkClass, "font-sans text-sm text-[var(--fg-1)]")}>
                      <span className="block">{hit.title}</span>
                      {hit.subtitle ? (
                        <span className="mt-0.5 block font-sans text-xs text-[var(--fg-4)]">
                          {hit.subtitle}
                        </span>
                      ) : null}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {SEMANTIC_FLAG ? (
        <section aria-labelledby="search-semantic">
          <h2
            id="search-semantic"
            className="font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--fg-4)]"
          >
            Knowledge base
          </h2>
          {semantic.semantic_available === false ? (
            <p className="mt-4 font-serif text-sm italic text-[var(--fg-3)]">
              Semantic search is unavailable (API embedding not configured).
            </p>
          ) : semantic.results.length === 0 ? (
            <p className="mt-4 font-serif text-sm italic text-[var(--fg-3)]">
              No close matches in embedded sources.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[rgba(0,15,34,0.06)]">
              {semantic.results.map((hit, i) => {
                const url = hit.source_url?.trim();
                const key = hit.id ?? `sem-${i}`;
                const inner = (
                  <>
                    <span className="block font-sans text-sm text-[var(--fg-1)]">{hit.title}</span>
                    <span className="mt-0.5 block font-sans text-xs text-[var(--fg-4)]">
                      {[hit.source_type, hit.score != null ? hit.score.toFixed(3) : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </>
                );
                return (
                  <li key={key} className="py-1">
                    {url?.startsWith("http") ? (
                      <a
                        href={url}
                        className={cn(hitLinkClass, "font-sans text-[var(--fg-1)]")}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {inner}
                      </a>
                    ) : (
                      <div className={cn(hitLinkClass, "cursor-default font-sans text-[var(--fg-1)]")}>{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: raw } = await searchParams;
  const q = (raw ?? "").trim();

  return (
    <div>
      <nav className="font-sans text-xs text-[var(--fg-4)]">
        <Link href="/" className="hover:text-[var(--fg-2)]">
          Briefing
        </Link>
        <span className="mx-2 text-[var(--fg-4)]">·</span>
        <span className="text-[var(--fg-3)]">Search</span>
      </nav>
      <h1 className="mt-4 font-serif text-3xl font-normal text-[var(--fg-1)] md:text-[40px]">Search</h1>
      <p className="mt-3 max-w-2xl font-sans text-sm text-[var(--fg-3)]">
        Lexical matches across officials and published opinions, bills, and media. Optional semantic matches
        over embedded knowledge chunks.
      </p>
      <form action="/search" method="get" className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          name="q"
          defaultValue={q}
          minLength={2}
          placeholder="Start typing…"
          aria-label="Search query"
          className="min-h-11 w-full min-w-0 rounded-[var(--radius-md)] border border-[rgba(0,15,34,0.12)] bg-surface-1 px-3.5 py-2 font-sans text-sm text-[var(--fg-1)] outline-none placeholder:text-[var(--fg-4)] focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4 sm:max-w-xl"
        />
        <button
          type="submit"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--fg-1)] px-5 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--surface)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4"
        >
          Search
        </button>
      </form>
      {q.length > 0 && q.length < 2 ? (
        <p className="mt-6 font-serif text-base italic text-[var(--fg-3)]">Enter at least 2 characters.</p>
      ) : null}
      {q.length >= 2 ? (
        <Suspense
          fallback={
            <p className="mt-10 font-serif text-base italic text-[var(--fg-3)]" aria-busy="true">
              Searching…
            </p>
          }
        >
          <SearchBody q={q} />
        </Suspense>
      ) : null}
      {q.length === 0 ? (
        <p className="mt-6 max-w-xl font-sans text-sm text-[var(--fg-3)]">
          Press <kbd className="rounded px-1 font-mono text-xs">⌘K</kbd> anywhere in the console for quick
          search.
        </p>
      ) : null}
    </div>
  );
}
