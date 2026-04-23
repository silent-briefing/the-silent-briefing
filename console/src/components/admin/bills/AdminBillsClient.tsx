"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BffHttpError, bffJson } from "@/lib/bff/client";
import { billListResponseSchema, billRowSchema } from "@/lib/schemas/admin-bills";
import { cn } from "@/lib/utils";

export function AdminBillsClient({ className }: { className?: string }) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const [billNumber, setBillNumber] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [createMsg, setCreateMsg] = React.useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ["admin-bills-list"],
    queryFn: () =>
      bffJson({
        path: "/v1/admin/bills",
        getToken: () => getToken(),
        schema: billListResponseSchema,
      }),
  });

  const createMut = useMutation({
    mutationFn: async () =>
      bffJson({
        path: "/v1/admin/bills",
        method: "POST",
        body: { bill_number: billNumber.trim(), title: title.trim() },
        getToken: () => getToken(),
        schema: billRowSchema,
      }),
    onSuccess: () => {
      setCreateMsg("Bill created.");
      setBillNumber("");
      setTitle("");
      void qc.invalidateQueries({ queryKey: ["admin-bills-list"] });
    },
    onError: (e: unknown) => {
      if (e instanceof BffHttpError) {
        setCreateMsg(`Create failed (${e.status}).`);
        return;
      }
      setCreateMsg(e instanceof Error ? e.message : "Create failed.");
    },
  });

  const toggleMut = useMutation({
    mutationFn: async (row: { id: string; published: boolean }) =>
      bffJson({
        path: `/v1/admin/bills/${encodeURIComponent(row.id)}`,
        method: "PATCH",
        body: { published: !row.published },
        getToken: () => getToken(),
        schema: billRowSchema,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-bills-list"] }),
  });

  return (
    <div className={cn("space-y-10", className)}>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <p className="font-sans text-xs uppercase tracking-[0.14em] text-[var(--fg-4)]">New bill</p>
        <p className="mt-2 font-sans text-sm text-[var(--fg-3)]">
          Sponsors and related opinions can live in <span className="font-mono text-[11px]">metadata</span> (JSON) via
          API or future editor.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bill-number">Bill number</Label>
            <Input
              id="bill-number"
              value={billNumber}
              onChange={(ev) => setBillNumber(ev.target.value)}
              placeholder="HB 123"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bill-title">Title</Label>
            <Input
              id="bill-title"
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
              placeholder="Short title"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={createMut.isPending || !billNumber.trim() || title.trim().length < 2}
            onClick={() => void createMut.mutate()}
          >
            {createMut.isPending ? "Creating…" : "Create bill"}
          </Button>
          {createMsg ? <span className="font-sans text-sm text-[var(--fg-3)]">{createMsg}</span> : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] font-sans text-[10px] uppercase tracking-[0.14em] text-[var(--fg-4)]">
              <th className="px-3 py-2 font-medium">Number</th>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Published</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(listQ.data?.items ?? []).map((row) => (
              <tr key={row.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-1)]">
                <td className="px-3 py-2 font-mono text-xs">{row.bill_number}</td>
                <td className="px-3 py-2">{row.title}</td>
                <td className="px-3 py-2 font-sans text-xs text-[var(--fg-3)]">{row.published ? "Yes" : "No"}</td>
                <td className="px-3 py-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={toggleMut.isPending}
                    onClick={() => void toggleMut.mutate(row)}
                  >
                    {row.published ? "Unpublish" : "Publish"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {listQ.isLoading ? <p className="text-sm text-[var(--fg-3)]">Loading…</p> : null}
    </div>
  );
}
