"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BffHttpError, bffJson } from "@/lib/bff/client";
import { type MediaRow, mediaFormSchema, type MediaFormValues, mediaRowSchema } from "@/lib/schemas/admin-media";
import { officialsListResponseSchema } from "@/lib/schemas/official";
import { cn } from "@/lib/utils";

type Mode = "create" | "edit";

export function MediaForm({
  mode,
  initial,
  selectedOfficialIds,
  onOfficialIdsChange,
  onDone,
  className,
}: {
  mode: Mode;
  initial?: MediaRow | null;
  selectedOfficialIds: Set<string>;
  onOfficialIdsChange: (next: Set<string>) => void;
  onDone?: () => void;
  className?: string;
}) {
  const fieldId = (s: string) => `media-${mode}-${s}`;
  const { getToken } = useAuth();
  const qc = useQueryClient();

  const officialsQ = useQuery({
    queryKey: ["admin-officials-pick", "media"],
    queryFn: () =>
      bffJson({
        path: "/v1/admin/officials?limit=100&offset=0",
        getToken: () => getToken(),
        schema: officialsListResponseSchema,
      }),
  });

  const form = useForm<MediaFormValues>({
    resolver: zodResolver(mediaFormSchema),
    defaultValues: {
      headline: initial?.headline ?? "",
      outlet: initial?.outlet ?? "",
      source_url: initial?.source_url ?? "",
      summary: initial?.summary ?? "",
      published: initial?.published ?? false,
      published_at: initial?.published_at ?? "",
      fetched_at: initial?.fetched_at ?? "",
    },
  });

  const createMut = useMutation({
    mutationFn: async (values: MediaFormValues) =>
      bffJson({
        path: "/v1/admin/media",
        method: "POST",
        body: {
          headline: values.headline,
          outlet: values.outlet,
          source_url: values.source_url,
          summary: values.summary,
          published: values.published,
          published_at: values.published_at,
          fetched_at: values.fetched_at,
          official_ids: Array.from(selectedOfficialIds),
        },
        getToken: () => getToken(),
        schema: mediaRowSchema,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-media-list"] });
      form.reset({
        headline: "",
        outlet: "",
        source_url: "",
        summary: "",
        published: false,
        published_at: "",
        fetched_at: "",
      });
      onOfficialIdsChange(new Set());
      onDone?.();
    },
  });

  const patchMut = useMutation({
    mutationFn: async (values: MediaFormValues) => {
      if (!initial) throw new Error("missing initial");
      return bffJson({
        path: `/v1/admin/media/${encodeURIComponent(initial.id)}`,
        method: "PATCH",
        body: {
          headline: values.headline,
          outlet: values.outlet,
          source_url: values.source_url,
          summary: values.summary,
          published: values.published,
          published_at: values.published_at,
          fetched_at: values.fetched_at,
          official_ids: Array.from(selectedOfficialIds),
        },
        getToken: () => getToken(),
        schema: mediaRowSchema,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-media-list"] });
      onDone?.();
    },
  });

  const mut = mode === "create" ? createMut : patchMut;
  const [err, setErr] = React.useState<string | null>(null);

  const onSubmit = form.handleSubmit((values) => {
    setErr(null);
    mut.mutate(values, {
      onError: (e: unknown) => {
        if (e instanceof BffHttpError) {
          setErr(`Request failed (${e.status})`);
          return;
        }
        setErr(e instanceof Error ? e.message : "Failed");
      },
    });
  });

  const toggleOfficial = (id: string) => {
    const next = new Set(selectedOfficialIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onOfficialIdsChange(next);
  };

  return (
    <form onSubmit={onSubmit} className={cn("space-y-4", className)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={fieldId("headline")}>Headline</Label>
          <Input id={fieldId("headline")} autoComplete="off" {...form.register("headline")} />
          {form.formState.errors.headline ? (
            <p className="text-sm text-[var(--secondary)]">{form.formState.errors.headline.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor={fieldId("outlet")}>Outlet</Label>
          <Input id={fieldId("outlet")} autoComplete="off" {...form.register("outlet")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={fieldId("url")}>Source URL</Label>
          <Input
            id={fieldId("url")}
            type="url"
            placeholder="https://…"
            autoComplete="off"
            {...form.register("source_url")}
          />
          {form.formState.errors.source_url ? (
            <p className="text-sm text-[var(--secondary)]">{form.formState.errors.source_url.message}</p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="media-summary">Summary</Label>
          <textarea
            id="media-summary"
            className={cn(
              "border-input bg-background ring-offset-background placeholder:text-muted-foreground",
              "focus-visible:ring-ring flex min-h-[88px] w-full rounded-md border px-3 py-2 text-sm",
              "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            )}
            {...form.register("summary")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={fieldId("published-at")}>Published at (ISO optional)</Label>
          <Input
            id={fieldId("published-at")}
            placeholder="2026-04-21T12:00:00Z"
            {...form.register("published_at")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={fieldId("fetched-at")}>Fetched at (ISO optional)</Label>
          <Input
            id={fieldId("fetched-at")}
            placeholder="2026-04-21T12:00:00Z"
            {...form.register("fetched_at")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="font-sans text-xs uppercase tracking-[0.14em] text-[var(--fg-4)]">Linked officials</p>
        <div className="max-h-40 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--surface-1)] p-2">
          {officialsQ.isLoading ? (
            <p className="text-sm text-[var(--fg-3)]">Loading roster…</p>
          ) : (
            <ul className="space-y-2">
              {(officialsQ.data?.items ?? []).map((o) => (
                <li key={o.id} className="flex items-start gap-2">
                  <Checkbox
                    id={fieldId(`off-${o.id}`)}
                    checked={selectedOfficialIds.has(o.id)}
                    onCheckedChange={() => toggleOfficial(o.id)}
                  />
                  <label htmlFor={fieldId(`off-${o.id}`)} className="cursor-pointer font-sans text-sm leading-tight">
                    <span className="text-primary">{o.full_name}</span>
                    <span className="mt-0.5 block font-mono text-[10px] text-[var(--fg-4)]">{o.id}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Controller
        name="published"
        control={form.control}
        render={({ field }) => (
          <label className="flex items-center gap-2 font-sans text-sm text-[var(--fg-2)]">
            <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
            Published (visible to authenticated readers when on)
          </label>
        )}
      />

      {err ? <p className="text-sm text-[var(--secondary)]">{err}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={mut.isPending}>
          {mut.isPending ? "Saving…" : mode === "create" ? "Create coverage" : "Save changes"}
        </Button>
        {mode === "edit" ? (
          <Button type="button" variant="outline" onClick={() => onDone?.()}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
