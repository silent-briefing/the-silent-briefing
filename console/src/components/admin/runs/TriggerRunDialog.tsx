"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BffHttpError, bffJson } from "@/lib/bff/client";
import { officialsListResponseSchema } from "@/lib/schemas/official";
import {
  triggerCatalogResponseSchema,
  triggerRunResponseSchema,
  type TriggerCatalogJob,
} from "@/lib/schemas/admin-runs";

const formSchema = z.object({
  job: z.string().min(1, "Pick a job"),
  official_id: z.string(),
  subject: z.string(),
  correlation_text: z.string(),
  correlation_context: z.string(),
  stages: z.string(),
  rag_context: z.string(),
  idempotency_key: z.string(),
  use_routing: z.boolean(),
  skip_if_fresh: z.boolean(),
  correlate: z.boolean(),
  rag_query: z.string(),
  rag_match_count: z.string(),
  opinion_limit: z.string(),
  retention_slugs: z.string(),
  min_confidence: z.string(),
  no_embed: z.boolean(),
  no_correlate: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

const defaults: FormValues = {
  job: "",
  official_id: "",
  subject: "",
  correlation_text: "",
  correlation_context: "",
  stages: "A,B,C",
  rag_context: "",
  idempotency_key: "",
  use_routing: false,
  skip_if_fresh: false,
  correlate: false,
  rag_query: "",
  rag_match_count: "",
  opinion_limit: "",
  retention_slugs: "",
  min_confidence: "",
  no_embed: false,
  no_correlate: false,
};

function buildTriggerBody(values: FormValues, meta: TriggerCatalogJob | undefined): Record<string, unknown> {
  const body: Record<string, unknown> = { job: values.job.trim() };
  const oid = values.official_id.trim();
  if (oid) body.official_id = oid;
  const ik = values.idempotency_key.trim();
  if (ik) body.idempotency_key = ik;
  if (meta?.requires_subject) {
    body.subject = values.subject.trim();
  }
  if (meta?.requires_correlation_text) {
    body.correlation_text = values.correlation_text.trim();
    const ctx = values.correlation_context.trim();
    if (ctx) body.correlation_context = ctx;
    const mc = values.min_confidence.trim();
    if (mc) body.min_confidence = Number(mc);
  }
  if (values.job === "retrieval-pass") {
    const sub = values.subject.trim();
    if (sub) body.subject = sub;
    const st = values.stages.trim();
    if (st) body.stages = st;
    const rc = values.rag_context.trim();
    if (rc) body.rag_context = rc;
    body.use_routing = values.use_routing;
    body.skip_if_fresh = values.skip_if_fresh;
    body.correlate = values.correlate;
  }
  if (values.job === "dossier-write") {
    const rq = values.rag_query.trim();
    if (rq) body.rag_query = rq;
    const rmc = values.rag_match_count.trim();
    if (rmc) body.rag_match_count = parseInt(rmc, 10);
  }
  if (values.job === "retention-extraction") {
    const sl = values.retention_slugs.trim();
    if (sl) body.retention_slugs = sl;
  }
  if (values.job === "opinion-ingestion") {
    const lim = values.opinion_limit.trim();
    if (lim) body.opinion_limit = parseInt(lim, 10);
    body.no_embed = values.no_embed;
    body.no_correlate = values.no_correlate;
  }
  return body;
}

export function TriggerRunDialog({ getToken }: { getToken: () => Promise<string | null> }) {
  const [open, setOpen] = React.useState(false);
  const qc = useQueryClient();

  const catalogQuery = useQuery({
    queryKey: ["admin-runs-catalog"],
    queryFn: () =>
      bffJson({
        path: "/v1/admin/runs/catalog",
        getToken: () => getToken(),
        schema: triggerCatalogResponseSchema,
      }),
    enabled: open,
  });

  const officialsQuery = useQuery({
    queryKey: ["admin-officials-picker", "runs-trigger"],
    queryFn: () =>
      bffJson({
        path: "/v1/admin/officials?limit=200&offset=0",
        getToken: () => getToken(),
        schema: officialsListResponseSchema,
      }),
    enabled: open,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults,
  });

  const jobWatch = form.watch("job");
  const meta = React.useMemo(
    () => catalogQuery.data?.jobs.find((j) => j.job_id === jobWatch),
    [catalogQuery.data?.jobs, jobWatch],
  );

  const triggerMut = useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      bffJson({
        path: "/v1/admin/runs/trigger",
        method: "POST",
        body,
        getToken: () => getToken(),
        schema: triggerRunResponseSchema,
      }),
    onSuccess: (data) => {
      toast.success(`Run started (${data.run_id.slice(0, 8)}…)`);
      void qc.invalidateQueries({ queryKey: ["admin-intel-runs"] });
      setOpen(false);
      form.reset(defaults);
    },
    onError: (err: unknown) => {
      if (err instanceof BffHttpError && err.status === 409) {
        const raw = err.body as { detail?: { existing_run_id?: string; in_flight?: boolean } };
        const id = raw?.detail?.existing_run_id;
        toast.error(
          id
            ? `Duplicate idempotency key (${raw.detail?.in_flight ? "in flight" : "already used"}) — ${id}`
            : "Duplicate idempotency key",
        );
        return;
      }
      const msg = err instanceof Error ? err.message : "Trigger failed";
      toast.error(msg);
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    const m = catalogQuery.data?.jobs.find((j) => j.job_id === values.job);
    if (!m) {
      toast.error("Job catalog not loaded");
      return;
    }
    if (m.requires_official_id && !values.official_id.trim()) {
      toast.error("Official is required for this job");
      return;
    }
    if (m.requires_subject && !values.subject.trim()) {
      toast.error("Subject / brief is required");
      return;
    }
    if (m.requires_correlation_text && !values.correlation_text.trim()) {
      toast.error("Correlation text is required");
      return;
    }
    triggerMut.mutate(buildTriggerBody(values, m));
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) form.reset(defaults);
      }}
    >
      <DialogTrigger render={<Button type="button" size="sm" />}>Trigger run</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-primary">Trigger intel run</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Job</Label>
            <select
              className="flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 text-sm text-primary"
              value={form.watch("job")}
              onChange={(e) => form.setValue("job", e.target.value, { shouldValidate: true })}
            >
              <option value="">Select…</option>
              {(catalogQuery.data?.jobs ?? []).map((j) => (
                <option key={j.job_id} value={j.job_id}>
                  {j.title}
                </option>
              ))}
            </select>
            {meta ? <p className="text-xs text-[var(--fg-3)]">{meta.description}</p> : null}
          </div>

          {meta?.requires_official_id ? (
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Official</Label>
              <select
                className="flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 text-sm text-primary"
                value={form.watch("official_id")}
                onChange={(e) => form.setValue("official_id", e.target.value)}
              >
                <option value="">Select…</option>
                {(officialsQuery.data?.items ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.full_name} ({o.slug})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {meta?.requires_subject ? (
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">
                Subject / brief
              </Label>
              <Textarea {...form.register("subject")} rows={3} className="resize-y" />
            </div>
          ) : null}

          {meta?.requires_correlation_text ? (
            <>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">
                  Text to correlate
                </Label>
                <Textarea {...form.register("correlation_text")} rows={5} className="resize-y font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">
                  Context (optional)
                </Label>
                <Input {...form.register("correlation_context")} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">
                  Min confidence (optional)
                </Label>
                <Input {...form.register("min_confidence")} placeholder="0.8" />
              </div>
            </>
          ) : null}

          {jobWatch === "retrieval-pass" ? (
            <>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">
                  Subject override (optional)
                </Label>
                <Input {...form.register("subject")} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Stages</Label>
                <Input {...form.register("stages")} placeholder="A,B,C" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">
                  RAG context (optional)
                </Label>
                <Input {...form.register("rag_context")} />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-primary">
                  <Checkbox
                    checked={form.watch("use_routing")}
                    onCheckedChange={(v) => form.setValue("use_routing", v === true)}
                  />
                  Use routing
                </label>
                <label className="flex items-center gap-2 text-sm text-primary">
                  <Checkbox
                    checked={form.watch("skip_if_fresh")}
                    onCheckedChange={(v) => form.setValue("skip_if_fresh", v === true)}
                  />
                  Skip if fresh
                </label>
                <label className="flex items-center gap-2 text-sm text-primary">
                  <Checkbox
                    checked={form.watch("correlate")}
                    onCheckedChange={(v) => form.setValue("correlate", v === true)}
                  />
                  Correlate
                </label>
              </div>
            </>
          ) : null}

          {jobWatch === "dossier-write" ? (
            <>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">
                  RAG query (optional)
                </Label>
                <Input {...form.register("rag_query")} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">
                  RAG match count
                </Label>
                <Input {...form.register("rag_match_count")} placeholder="8" />
              </div>
            </>
          ) : null}

          {jobWatch === "retention-extraction" ? (
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">
                Slugs (optional, comma-separated)
              </Label>
              <Input {...form.register("retention_slugs")} />
            </div>
          ) : null}

          {jobWatch === "opinion-ingestion" ? (
            <>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Limit</Label>
                <Input {...form.register("opinion_limit")} placeholder="3" />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-primary">
                  <Checkbox
                    checked={form.watch("no_embed")}
                    onCheckedChange={(v) => form.setValue("no_embed", v === true)}
                  />
                  No embed
                </label>
                <label className="flex items-center gap-2 text-sm text-primary">
                  <Checkbox
                    checked={form.watch("no_correlate")}
                    onCheckedChange={(v) => form.setValue("no_correlate", v === true)}
                  />
                  No correlate
                </label>
              </div>
            </>
          ) : null}

          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">
              Idempotency key (optional)
            </Label>
            <Input {...form.register("idempotency_key")} placeholder="UUID or unique string" />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={triggerMut.isPending || !jobWatch}>
              {triggerMut.isPending ? "Starting…" : "Start run"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
