"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BffHttpError, bffJson } from "@/lib/bff/client";
import {
  opinionDetailResponseSchema,
  opinionEdgeCreateResponseSchema,
  opinionRowSchema,
} from "@/lib/schemas/admin-opinions";
import { cn } from "@/lib/utils";

export function OpinionDetailClient({ opinionId }: { opinionId: string }) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const [targetEntityId, setTargetEntityId] = React.useState("");
  const [relation, setRelation] = React.useState("related_to");
  const [edgeMsg, setEdgeMsg] = React.useState<string | null>(null);

  const detailQ = useQuery({
    queryKey: ["admin-opinion-detail", opinionId],
    queryFn: () =>
      bffJson({
        path: `/v1/admin/opinions/${encodeURIComponent(opinionId)}`,
        getToken: () => getToken(),
        schema: opinionDetailResponseSchema,
      }),
  });

  const patchMut = useMutation({
    mutationFn: async (body: { published?: boolean; title?: string }) =>
      bffJson({
        path: `/v1/admin/opinions/${encodeURIComponent(opinionId)}`,
        method: "PATCH",
        body,
        getToken: () => getToken(),
        schema: opinionRowSchema,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-opinion-detail", opinionId] }),
  });

  const edgeMut = useMutation({
    mutationFn: async () =>
      bffJson({
        path: `/v1/admin/opinions/${encodeURIComponent(opinionId)}/edges`,
        method: "POST",
        body: { target_entity_id: targetEntityId.trim(), relation: relation.trim() || "related_to" },
        getToken: () => getToken(),
        schema: opinionEdgeCreateResponseSchema,
      }),
    onSuccess: (data) => {
      setEdgeMsg(`Accepted edge ${data.edge_id}`);
      setTargetEntityId("");
    },
    onError: (e: unknown) => {
      if (e instanceof BffHttpError) {
        setEdgeMsg(`Edge failed (${e.status})`);
        return;
      }
      setEdgeMsg(e instanceof Error ? e.message : "Edge failed");
    },
  });

  if (detailQ.isLoading) {
    return <p className="font-sans text-sm text-[var(--fg-3)]">Loading opinion…</p>;
  }
  if (detailQ.isError || !detailQ.data) {
    return <p className="font-sans text-sm text-[var(--secondary)]">Could not load this opinion.</p>;
  }

  const { opinion, chunks } = detailQ.data;

  return (
    <div className="space-y-10">
      <div>
        <Link href="/admin/opinions" className="font-sans text-sm text-primary underline-offset-4 hover:underline">
          ← All opinions
        </Link>
        <p className="mt-4 font-sans text-sm uppercase tracking-[0.2em] text-[var(--fg-4)]">Opinion</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-primary">{opinion.title}</h1>
        <p className="mt-2 font-mono text-xs text-[var(--fg-4)]">{opinion.id}</p>
        <dl className="mt-4 grid gap-2 font-sans text-sm text-[var(--fg-3)] sm:grid-cols-2">
          <div>
            <dt className="text-[var(--fg-4)]">Ingestion</dt>
            <dd>{opinion.ingestion_status}</dd>
          </div>
          <div>
            <dt className="text-[var(--fg-4)]">Issue entity</dt>
            <dd className="font-mono text-xs">{opinion.entity_id ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[var(--fg-4)]">PDF path</dt>
            <dd className="break-all font-mono text-xs">{opinion.pdf_storage_path ?? "—"}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant={opinion.published ? "outline" : "default"}
            disabled={patchMut.isPending}
            onClick={() => void patchMut.mutate({ published: !opinion.published })}
          >
            {opinion.published ? "Unpublish" : "Publish"}
          </Button>
          {patchMut.isError ? (
            <span className="text-sm text-[var(--secondary)]">Update failed</span>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <p className="font-sans text-xs uppercase tracking-[0.14em] text-[var(--fg-4)]">Graph link (accepted edge)</p>
        <p className="mt-2 font-sans text-sm text-[var(--fg-3)]">
          Creates an <span className="font-mono text-[11px]">entity_edges</span> row with{" "}
          <span className="font-mono text-[11px]">status=accepted</span> from this opinion&apos;s issue entity.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="target-entity">Target entity id</Label>
            <Input
              id="target-entity"
              value={targetEntityId}
              onChange={(ev) => setTargetEntityId(ev.target.value)}
              placeholder="UUID"
              className="font-mono text-xs"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="relation">Relation</Label>
            <Input
              id="relation"
              value={relation}
              onChange={(ev) => setRelation(ev.target.value)}
              placeholder="related_to"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" disabled={edgeMut.isPending} onClick={() => void edgeMut.mutate()}>
            {edgeMut.isPending ? "Saving…" : "Create accepted edge"}
          </Button>
          {edgeMsg ? <span className="font-sans text-sm text-[var(--fg-3)]">{edgeMsg}</span> : null}
        </div>
      </div>

      <div>
        <h2 className="font-serif text-xl font-semibold text-primary">Chunks ({chunks.length})</h2>
        <ul className="mt-4 space-y-4">
          {chunks.map((c) => (
            <li
              key={c.id}
              className={cn(
                "rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4",
                "font-sans text-sm leading-relaxed text-[var(--fg-2)]",
              )}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--fg-4)]">
                #{c.chunk_index} · {c.id}
              </p>
              <p className="mt-2 whitespace-pre-wrap">{c.content}</p>
            </li>
          ))}
        </ul>
        {chunks.length === 0 ? (
          <p className="mt-4 font-sans text-sm text-[var(--fg-3)]">
            No chunks yet. When ingestion finishes, RAG chunks keyed to this opinion will appear here.
          </p>
        ) : null}
      </div>
    </div>
  );
}
