"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BffHttpError, bffJson } from "@/lib/bff/client";
import { adminSourcesListResponseSchema } from "@/lib/schemas/admin-sources";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  url: z.string().min(4, "URL required"),
});

type FormValues = z.infer<typeof formSchema>;

export function SourceEditClient({
  settingKey,
  className,
}: {
  settingKey: string;
  className?: string;
}) {
  const { getToken } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const listQ = useQuery({
    queryKey: ["admin-sources-list"],
    queryFn: () =>
      bffJson({
        path: "/v1/admin/sources",
        getToken: () => getToken(),
        schema: adminSourcesListResponseSchema,
      }),
  });

  const row = listQ.data?.items.find((i) => i.key === settingKey);

  const form = useForm<FormValues>({
    defaultValues: { url: "" },
    values: row ? { url: row.effective } : undefined,
  });

  const mut = useMutation({
    mutationFn: async (url: string) =>
      bffJson({
        path: `/v1/admin/sources/${encodeURIComponent(settingKey)}`,
        method: "PATCH",
        body: { url },
        getToken: () => getToken(),
        schema: z.object({ key: z.string(), url: z.string() }),
      }),
    onSuccess: () => {
      toast.success("Saved");
      void qc.invalidateQueries({ queryKey: ["admin-sources-list"] });
      router.push("/admin/sources");
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof BffHttpError
          ? typeof e.body === "object" && e.body && "detail" in e.body
            ? String((e.body as { detail: unknown }).detail)
            : e.message
          : "Save failed";
      toast.error(msg);
    },
  });

  if (listQ.isLoading) {
    return <p className="text-sm text-[var(--fg-3)]">Loading…</p>;
  }
  if (!row) {
    return <p className="text-sm text-[var(--secondary)]">Unknown setting key.</p>;
  }

  return (
    <div className={cn("max-w-2xl space-y-8", className)}>
      <Link href="/admin/sources" className="font-sans text-sm text-primary underline-offset-4 hover:underline">
        ← All sources
      </Link>
      <div>
        <h1 className="font-serif text-2xl font-semibold text-primary">{row.label}</h1>
        <p className="mt-2 font-sans text-sm text-[var(--fg-3)]">{row.description}</p>
        <p className="mt-2 font-mono text-xs text-[var(--fg-4)]">Default: {row.default}</p>
      </div>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((v) => {
          const parsed = formSchema.safeParse(v);
          if (!parsed.success) {
            toast.error("Invalid URL");
            return;
          }
          mut.mutate(parsed.data.url.trim());
        })}
      >
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Effective URL</Label>
          <Input {...form.register("url")} className="font-mono text-sm" />
        </div>
        <Button type="submit" disabled={mut.isPending}>
          {mut.isPending ? "Saving…" : "Save override"}
        </Button>
      </form>
    </div>
  );
}
