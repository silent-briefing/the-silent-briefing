"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BffHttpError, bffJson } from "@/lib/bff/client";
import { operatorFeedsResponseSchema } from "@/lib/schemas/admin-feeds";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  cache_seconds: z.string().min(1, "Required"),
  x_enabled: z.boolean(),
  perplexity_enabled: z.boolean(),
  opt_out_raw: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export function FeedsConfigClient({ className }: { className?: string }) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin-feeds-config"],
    queryFn: () =>
      bffJson({
        path: "/v1/admin/feeds",
        getToken: () => getToken(),
        schema: operatorFeedsResponseSchema,
      }),
  });

  const form = useForm<FormValues>({
    defaultValues: {
      cache_seconds: "",
      x_enabled: true,
      perplexity_enabled: true,
      opt_out_raw: "",
    },
    values: q.data
      ? {
          cache_seconds: String(q.data.stored.cache_seconds),
          x_enabled: q.data.stored.x_enabled,
          perplexity_enabled: q.data.stored.perplexity_enabled,
          opt_out_raw: q.data.stored.opt_out_official_ids.join("\n"),
        }
      : undefined,
  });

  const mut = useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      bffJson({
        path: "/v1/admin/feeds",
        method: "PATCH",
        body,
        getToken: () => getToken(),
        schema: operatorFeedsResponseSchema,
      }),
    onSuccess: () => {
      toast.success("Feeds config saved");
      void qc.invalidateQueries({ queryKey: ["admin-feeds-config"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof BffHttpError ? e.message : "Save failed");
    },
  });

  return (
    <div className={cn("max-w-2xl space-y-8", className)}>
      <p className="font-sans text-sm text-[var(--fg-3)]">
        Controls X + Perplexity aggregation for operator feeds. Per-official opt-out returns an empty feed list (not an
        error). Effective values reflect the merged <span className="font-mono">operator_feeds</span> row after save.
      </p>
      <Link href="/admin/sources" className="font-sans text-sm text-primary underline-offset-4 hover:underline">
        ← Source URLs
      </Link>

      {q.data ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 font-mono text-xs text-[var(--fg-3)]">
          <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-[var(--fg-4)]">Effective (runtime)</p>
          <p className="mt-2">cache_seconds: {q.data.effective.cache_seconds}</p>
          <p>x_enabled: {String(q.data.effective.x_enabled)}</p>
          <p>perplexity_enabled: {String(q.data.effective.perplexity_enabled)}</p>
          <p className="mt-1 break-all">opt_out: {q.data.effective.opt_out_official_ids.join(", ") || "—"}</p>
        </div>
      ) : null}

      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((v) => {
          const parsed = formSchema.safeParse(v);
          if (!parsed.success) {
            toast.error("Check form fields");
            return;
          }
          const cs = parseInt(parsed.data.cache_seconds, 10);
          if (Number.isNaN(cs) || cs < 0) {
            toast.error("Cache seconds must be a non-negative integer");
            return;
          }
          const ids = parsed.data.opt_out_raw
            .split(/[\s,]+/)
            .map((s) => s.trim())
            .filter(Boolean);
          mut.mutate({
            cache_seconds: cs,
            x_enabled: parsed.data.x_enabled,
            perplexity_enabled: parsed.data.perplexity_enabled,
            opt_out_official_ids: ids,
          });
        })}
      >
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Cache TTL (seconds)</Label>
          <Input
            {...form.register("cache_seconds")}
            className="w-40 font-mono text-sm"
            inputMode="numeric"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-primary">
          <Checkbox
            checked={form.watch("x_enabled")}
            onCheckedChange={(v) => form.setValue("x_enabled", v === true)}
          />
          X (Twitter) search enabled
        </label>
        <label className="flex items-center gap-2 text-sm text-primary">
          <Checkbox
            checked={form.watch("perplexity_enabled")}
            onCheckedChange={(v) => form.setValue("perplexity_enabled", v === true)}
          />
          Perplexity news enabled
        </label>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">
            Opt-out official IDs (one per line or comma-separated)
          </Label>
          <Textarea {...form.register("opt_out_raw")} rows={4} className="font-mono text-xs" />
        </div>
        <Button type="submit" disabled={mut.isPending || q.isLoading || !q.data}>
          {mut.isPending ? "Saving…" : "Save feeds config"}
        </Button>
      </form>
    </div>
  );
}
