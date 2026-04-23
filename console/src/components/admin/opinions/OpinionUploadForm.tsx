"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BffHttpError, bffFormData } from "@/lib/bff/client";
import { opinionCreateResponseSchema } from "@/lib/schemas/admin-opinions";
import { cn } from "@/lib/utils";

export function OpinionUploadForm({ className }: { className?: string }) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      if (!file || !title.trim()) {
        throw new Error("Title and PDF file are required.");
      }
      const fd = new FormData();
      fd.set("title", title.trim());
      fd.set("file", file, file.name);
      return bffFormData({
        path: "/v1/admin/opinions",
        formData: fd,
        getToken: () => getToken(),
        schema: opinionCreateResponseSchema,
      });
    },
    onSuccess: (data) => {
      setMessage(`Queued ingestion (run ${data.run_id}).`);
      setTitle("");
      setFile(null);
      void qc.invalidateQueries({ queryKey: ["admin-opinions-list"] });
    },
    onError: (e: unknown) => {
      if (e instanceof BffHttpError) {
        setMessage(`Upload failed (${e.status}).`);
        return;
      }
      setMessage(e instanceof Error ? e.message : "Upload failed.");
    },
  });

  return (
    <div className={cn("rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4", className)}>
      <p className="font-sans text-xs uppercase tracking-[0.14em] text-[var(--fg-4)]">Upload PDF</p>
      <p className="mt-2 font-sans text-sm text-[var(--fg-3)]">
        Stored privately, then chunked via the <span className="font-mono text-[11px]">opinion-ingestion</span> worker.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="opinion-title">Title</Label>
          <Input
            id="opinion-title"
            value={title}
            onChange={(ev) => setTitle(ev.target.value)}
            placeholder="Case or short title"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="opinion-pdf">PDF</Label>
          <Input
            id="opinion-pdf"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(ev) => setFile(ev.target.files?.[0] ?? null)}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" disabled={mut.isPending} onClick={() => void mut.mutate()}>
          {mut.isPending ? "Uploading…" : "Upload & enqueue"}
        </Button>
        {message ? <span className="font-sans text-sm text-[var(--fg-3)]">{message}</span> : null}
      </div>
    </div>
  );
}
