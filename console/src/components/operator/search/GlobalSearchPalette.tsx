"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { FileText, Gavel, Newspaper, Sparkles, User } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { SemanticSearchHit } from "@/lib/queries/schemas";
import { semanticSearchViaBff } from "@/lib/queries/search";
import { searchLexicalAll, type LexicalSearchHit } from "@/lib/search/lexical";
import { useSupabaseBrowser } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const SEMANTIC_ENV_ON = process.env.NEXT_PUBLIC_SEARCH_SEMANTIC !== "0";

function kindIcon(kind: LexicalSearchHit["kind"]) {
  switch (kind) {
    case "official":
      return User;
    case "bill":
      return FileText;
    case "opinion":
      return Gavel;
    case "media":
      return Newspaper;
  }
}

function kindLabel(kind: LexicalSearchHit["kind"]) {
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

export type GlobalSearchPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GlobalSearchPalette({ open, onOpenChange }: GlobalSearchPaletteProps) {
  const router = useRouter();
  const supabase = useSupabaseBrowser();
  const { getToken } = useAuth();
  const [q, setQ] = React.useState("");
  const [includeSemantic, setIncludeSemantic] = React.useState(SEMANTIC_ENV_ON);
  const deferred = React.useDeferredValue(q);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) {
        setQ("");
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handleOpenChange(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleOpenChange]);

  const { data: lexical = [], isFetching: lexLoading } = useQuery({
    queryKey: ["global-search-lexical", deferred],
    queryFn: () => searchLexicalAll(supabase, deferred, { limitPerKind: 12 }),
    enabled: open && deferred.trim().length >= 2,
  });

  const { data: semanticPayload, isFetching: semLoading } = useQuery({
    queryKey: ["global-search-semantic", deferred],
    queryFn: () => semanticSearchViaBff(() => getToken(), deferred),
    enabled: open && includeSemantic && SEMANTIC_ENV_ON && deferred.trim().length >= 2,
  });

  const groupedLex = React.useMemo(() => {
    const m = new Map<LexicalSearchHit["kind"], LexicalSearchHit[]>();
    for (const h of lexical) {
      const arr = m.get(h.kind) ?? [];
      arr.push(h);
      m.set(h.kind, arr);
    }
    return m;
  }, [lexical]);

  const semanticHits: SemanticSearchHit[] = semanticPayload?.results ?? [];

  const onSelectLexical = React.useCallback(
    (hit: LexicalSearchHit) => {
      handleOpenChange(false);
      if (hit.href.startsWith("http")) {
        window.open(hit.href, "_blank", "noopener,noreferrer");
        return;
      }
      router.push(hit.href);
    },
    [handleOpenChange, router],
  );

  const onSelectSemantic = React.useCallback(
    (hit: SemanticSearchHit) => {
      handleOpenChange(false);
      const url = hit.source_url?.trim();
      if (url?.startsWith("http")) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      router.push(`/search?q=${encodeURIComponent(deferred.trim())}`);
    },
    [deferred, handleOpenChange, router],
  );

  const kinds: LexicalSearchHit["kind"][] = ["official", "bill", "opinion", "media"];

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Search"
      description="Search officials, published records, and the knowledge base."
      className="max-w-xl"
      showCloseButton
    >
      <Command shouldFilter={false} className="bg-surface-1 text-[var(--fg-1)]">
        <CommandInput
          placeholder="Search…"
          value={q}
          onValueChange={setQ}
          className="text-[var(--fg-1)] placeholder:text-[var(--fg-4)]"
        />
        {SEMANTIC_ENV_ON ? (
          <label
            className={cn(
              "mx-1 mb-1 flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5",
              "font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--fg-4)]",
            )}
          >
            <input
              type="checkbox"
              className="size-3 accent-[var(--tertiary)]"
              checked={includeSemantic}
              onChange={(e) => setIncludeSemantic(e.target.checked)}
            />
            <Sparkles className="size-3" strokeWidth={1.5} aria-hidden />
            Include knowledge base
          </label>
        ) : null}
        <CommandList>
          <CommandEmpty className="px-3 py-6 text-center font-serif text-sm italic text-[var(--fg-3)]">
            {deferred.trim().length < 2
              ? "Enter at least 2 characters."
              : lexLoading || semLoading
                ? "Searching…"
                : "No matches."}
          </CommandEmpty>
          {kinds.map((kind) => {
            const rows = groupedLex.get(kind);
            if (!rows?.length) return null;
            const Icon = kindIcon(kind);
            return (
              <CommandGroup
                key={kind}
                heading={kindLabel(kind)}
                className="text-[var(--fg-4)] [&_[cmdk-group-heading]]:px-2"
              >
                {rows.map((hit) => (
                  <CommandItem
                    key={`${kind}-${hit.id}`}
                    value={`${kind}-${hit.id}`}
                    keywords={[hit.title, hit.subtitle ?? ""]}
                    onSelect={() => onSelectLexical(hit)}
                    className="cursor-pointer"
                  >
                    <Icon className="size-4 text-[var(--fg-3)]" strokeWidth={1.5} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-sans text-sm text-[var(--fg-1)]">{hit.title}</div>
                      {hit.subtitle ? (
                        <div className="truncate font-sans text-xs text-[var(--fg-4)]">
                          {hit.subtitle}
                        </div>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
          {includeSemantic && SEMANTIC_ENV_ON && semanticHits.length > 0 ? (
            <CommandGroup
              heading="Knowledge base"
              className="text-[var(--fg-4)] [&_[cmdk-group-heading]]:px-2"
            >
              {semanticHits.map((hit, i) => (
                <CommandItem
                  key={hit.id ?? `sem-${i}`}
                  value={`semantic-${hit.id ?? i}`}
                  keywords={[hit.title, hit.source_type ?? ""]}
                  onSelect={() => onSelectSemantic(hit)}
                  className="cursor-pointer"
                >
                  <Sparkles className="size-4 text-[var(--fg-3)]" strokeWidth={1.5} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-sans text-sm text-[var(--fg-1)]">{hit.title}</div>
                    <div className="truncate font-sans text-xs text-[var(--fg-4)]">
                      {hit.source_type ?? "snippet"}
                      {hit.score != null ? ` · ${hit.score.toFixed(3)}` : ""}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {includeSemantic && SEMANTIC_ENV_ON && !semLoading && semanticPayload?.semantic_available === false ? (
            <p className="px-3 py-2 font-sans text-xs text-[var(--fg-4)]">
              Semantic search is off (configure Perplexity on the API).
            </p>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
