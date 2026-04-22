"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchOfficialsLexical } from "@/lib/queries/search";
import { useSupabaseBrowser } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

export type ComparePickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftOrder: string[];
  onToggleSlug: (slug: string) => void;
  onApply: () => void;
  maxPick: number;
};

export function ComparePicker({
  open,
  onOpenChange,
  draftOrder,
  onToggleSlug,
  onApply,
  maxPick,
}: ComparePickerProps) {
  const supabase = useSupabaseBrowser();
  const [q, setQ] = React.useState("");
  const deferred = React.useDeferredValue(q);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["compare-officials-search", deferred],
    queryFn: () => searchOfficialsLexical(supabase, deferred, { limit: 40 }),
    enabled: open && deferred.trim().length >= 2,
  });

  const selected = new Set(draftOrder);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add officials to compare"
      description="Search by name. Select 2–4 justices or officials."
      className="max-w-lg"
    >
      <Command shouldFilter={false} className="bg-surface-1 text-[var(--fg-1)]">
        <CommandInput
          placeholder="Type a name…"
          value={q}
          onValueChange={setQ}
          className="text-[var(--fg-1)] placeholder:text-[var(--fg-4)]"
        />
        <CommandList>
          <CommandEmpty className="text-[var(--fg-3)]">
            {deferred.trim().length < 2
              ? "Enter at least 2 characters."
              : isFetching
                ? "Searching…"
                : "No matches."}
          </CommandEmpty>
          <CommandGroup heading="Officials" className="text-[var(--fg-4)]">
            {results.map((o) => {
              const isOn = selected.has(o.slug);
              return (
                <CommandItem
                  key={o.id}
                  value={o.slug}
                  keywords={[o.full_name, o.slug]}
                  disabled={!isOn && selected.size >= maxPick}
                  onSelect={() => onToggleSlug(o.slug)}
                  className={cn(
                    "data-[selected=true]:bg-[rgba(212,175,55,0.12)]",
                    isOn && "bg-[rgba(212,175,55,0.08)]",
                  )}
                >
                  <span className="font-serif text-[var(--fg-1)]">{o.full_name}</span>
                  <span className="ml-2 font-mono text-xs text-[var(--fg-4)]">{o.slug}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
        <div className="flex items-center justify-between gap-2 border-t border-[rgba(212,175,55,0.2)] p-3">
          <p className="font-mono text-xs text-[var(--fg-3)]">{draftOrder.join(", ") || "—"}</p>
          <Button type="button" size="sm" onClick={() => onApply()} disabled={draftOrder.length < 2}>
            Apply
          </Button>
        </div>
      </Command>
    </CommandDialog>
  );
}
