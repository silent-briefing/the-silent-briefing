"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { bffJson } from "@/lib/bff/client";
import { mediaListResponseSchema, type MediaRow } from "@/lib/schemas/admin-media";
import { officialsListResponseSchema } from "@/lib/schemas/official";
import { cn } from "@/lib/utils";

import { MediaForm } from "./MediaForm";

function buildListPath(pubFilter: "all" | "yes" | "no", officialFilter: string): string {
  const sp = new URLSearchParams();
  if (pubFilter === "yes") sp.set("published", "true");
  if (pubFilter === "no") sp.set("published", "false");
  if (officialFilter.trim()) sp.set("official_id", officialFilter.trim());
  const q = sp.toString();
  return q ? `/v1/admin/media?${q}` : "/v1/admin/media";
}

export function AdminMediaClient({ className }: { className?: string }) {
  const { getToken } = useAuth();
  const [pubFilter, setPubFilter] = React.useState<"all" | "yes" | "no">("all");
  const [officialFilter, setOfficialFilter] = React.useState("");
  const [createOfficialIds, setCreateOfficialIds] = React.useState(() => new Set<string>());
  const [editing, setEditing] = React.useState<MediaRow | null>(null);
  const [editOfficialIds, setEditOfficialIds] = React.useState(() => new Set<string>());

  const setCreateOfficialIdsCb = React.useCallback((s: Set<string>) => {
    setCreateOfficialIds(s);
  }, []);

  const setEditOfficialIdsCb = React.useCallback((s: Set<string>) => {
    setEditOfficialIds(s);
  }, []);

  const officialsQ = useQuery({
    queryKey: ["admin-officials-pick", "media-filter"],
    queryFn: () =>
      bffJson({
        path: "/v1/admin/officials?limit=100&offset=0",
        getToken: () => getToken(),
        schema: officialsListResponseSchema,
      }),
  });

  const listQ = useQuery({
    queryKey: ["admin-media-list", pubFilter, officialFilter],
    queryFn: () =>
      bffJson({
        path: buildListPath(pubFilter, officialFilter),
        getToken: () => getToken(),
        schema: mediaListResponseSchema,
      }),
  });

  return (
    <div className={cn("space-y-10", className)}>
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <div className="space-y-2">
          <Label htmlFor="filter-published">Publish state</Label>
          <select
            id="filter-published"
            className={cn(
              "border-input bg-background h-9 rounded-md border px-3 text-sm",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            )}
            value={pubFilter}
            onChange={(e) => setPubFilter(e.target.value as typeof pubFilter)}
          >
            <option value="all">All</option>
            <option value="yes">Published</option>
            <option value="no">Draft</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-official">Tagged official</Label>
          <select
            id="filter-official"
            className={cn(
              "border-input bg-background h-9 max-w-xs rounded-md border px-3 text-sm",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            )}
            value={officialFilter}
            onChange={(e) => setOfficialFilter(e.target.value)}
          >
            <option value="">Any</option>
            {(officialsQ.data?.items ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <p className="font-sans text-xs uppercase tracking-[0.14em] text-[var(--fg-4)]">New coverage</p>
        <MediaForm
          mode="create"
          selectedOfficialIds={createOfficialIds}
          onOfficialIdsChange={setCreateOfficialIdsCb}
          className="mt-4"
        />
      </div>

      {editing ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <p className="font-sans text-xs uppercase tracking-[0.14em] text-[var(--fg-4)]">Edit</p>
          <p className="mt-1 font-mono text-xs text-[var(--fg-4)]">{editing.id}</p>
          <MediaForm
            key={editing.id}
            mode="edit"
            initial={editing}
            selectedOfficialIds={editOfficialIds}
            onOfficialIdsChange={setEditOfficialIdsCb}
            onDone={() => setEditing(null)}
            className="mt-4"
          />
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[800px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] font-sans text-[10px] uppercase tracking-[0.14em] text-[var(--fg-4)]">
              <th className="px-3 py-2 font-medium">Headline</th>
              <th className="px-3 py-2 font-medium">Outlet</th>
              <th className="px-3 py-2 font-medium">Published</th>
              <th className="px-3 py-2 font-medium">Officials</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {(listQ.data?.items ?? []).map((row) => (
              <tr key={row.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-1)]">
                <td className="px-3 py-2">
                  <span className="font-medium text-primary">{row.headline}</span>
                  {row.source_url ? (
                    <a
                      href={row.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block truncate font-mono text-[10px] text-[var(--fg-4)] underline-offset-2 hover:underline"
                    >
                      {row.source_url}
                    </a>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-[var(--fg-3)]">{row.outlet ?? "—"}</td>
                <td className="px-3 py-2 text-[var(--fg-3)]">{row.published ? "Yes" : "No"}</td>
                <td className="px-3 py-2 font-mono text-[10px] text-[var(--fg-3)]">{row.official_ids.length}</td>
                <td className="px-3 py-2 text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditOfficialIds(new Set(row.official_ids));
                      setEditing(row);
                    }}
                  >
                    Edit
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
