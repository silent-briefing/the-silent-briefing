"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { MutationConfirm } from "@/components/admin/MutationConfirm";
import { OfficialsFilters } from "@/components/operator/officials/OfficialsFilters";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminOfficialsListPath } from "@/lib/admin/officials-bff";
import { BffHttpError, bffJson } from "@/lib/bff/client";
import { listJurisdictionOptions } from "@/lib/queries/jurisdictions";
import {
  officialsFiltersFromSearchParams,
  officialsFiltersToSearchParams,
  type OfficialsUrlFilters,
} from "@/lib/queries/officials-url-filters";
import { useSupabaseBrowser } from "@/lib/supabase/browser";
import {
  type OfficialAdminRow,
  officialAdminRowSchema,
  officialsListResponseSchema,
} from "@/lib/schemas/official";
import { cn } from "@/lib/utils";

const columnHelper = createColumnHelper<OfficialAdminRow>();

function detailFromBffError(body: unknown): string {
  if (body && typeof body === "object" && "detail" in body) {
    const d = (body as { detail?: unknown }).detail;
    if (typeof d === "string") return d;
  }
  return "Request failed";
}

export function AdminOfficialsList({ className }: { className?: string }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const supabase = useSupabaseBrowser();

  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10) || 0);
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") ?? "50", 10) || 50));

  const filters = React.useMemo(
    () => officialsFiltersFromSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const [searchDraft, setSearchDraft] = React.useState(searchParams.get("q") ?? "");
  React.useEffect(() => {
    setSearchDraft(searchParams.get("q") ?? "");
  }, [searchParams]);

  const { data: jurisdictions = [] } = useQuery({
    queryKey: ["jurisdiction-options"],
    queryFn: async () => listJurisdictionOptions(supabase),
  });

  const listPath = React.useMemo(
    () =>
      adminOfficialsListPath(filters, {
        page,
        pageSize,
        q: searchParams.get("q") ?? undefined,
      }),
    [filters, page, pageSize, searchParams],
  );

  const listQuery = useQuery({
    queryKey: ["admin-officials", listPath],
    queryFn: () =>
      bffJson({
        path: listPath,
        getToken: () => getToken(),
        schema: officialsListResponseSchema,
      }),
  });

  const [confirmId, setConfirmId] = React.useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      bffJson({
        path: `/v1/admin/officials/${id}`,
        method: "DELETE",
        getToken: () => getToken(),
        schema: officialAdminRowSchema,
      }),
    onSuccess: () => {
      toast.success("Official archived (soft delete)");
      void queryClient.invalidateQueries({ queryKey: ["admin-officials"] });
      setConfirmId(null);
    },
    onError: (e: unknown) => {
      const msg = e instanceof BffHttpError ? detailFromBffError(e.body) : "Delete failed";
      toast.error(msg);
    },
  });

  const pushFilters = React.useCallback(
    (next: OfficialsUrlFilters, opts?: { q?: string; page?: number }) => {
      const sp = officialsFiltersToSearchParams(next);
      const q = opts?.q !== undefined ? opts.q : searchParams.get("q") ?? "";
      if (q.trim()) sp.set("q", q.trim());
      else sp.delete("q");
      sp.set("page", String(opts?.page ?? 0));
      sp.set("pageSize", String(pageSize));
      router.push(`/admin/officials?${sp.toString()}`);
    },
    [router, searchParams, pageSize],
  );

  const columns = React.useMemo(
    () => [
      columnHelper.accessor("full_name", {
        header: "Name",
        cell: (ctx) => (
          <Link
            className="font-medium text-primary underline-offset-4 hover:underline"
            href={`/admin/officials/${ctx.row.original.id}`}
          >
            {ctx.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor("slug", { header: "Slug" }),
      columnHelper.accessor("office_type", { header: "Office" }),
      columnHelper.display({
        id: "jurisdiction",
        header: "Jurisdiction",
        cell: (ctx) => ctx.row.original.jurisdictions?.name ?? "—",
      }),
      columnHelper.accessor("party", {
        header: "Party",
        cell: (c) => c.getValue() ?? "—",
      }),
      columnHelper.accessor("is_current", {
        header: "Current",
        cell: (c) => (c.getValue() ? "Yes" : "No"),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (ctx) => (
          <div className="flex justify-end gap-2">
            <Link
              href={`/admin/officials/${ctx.row.original.id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Edit
            </Link>
            <Button variant="destructive" size="sm" onClick={() => setConfirmId(ctx.row.original.id)}>
              Archive
            </Button>
          </div>
        ),
      }),
    ],
    [],
  );

  const total = listQuery.data?.total ?? 0;
  const pageCount = total === 0 ? 1 : Math.ceil(total / pageSize);
  const maxPage = Math.max(0, pageCount - 1);

  const table = useReactTable({
    data: listQuery.data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
  });

  return (
    <div className={cn("space-y-8", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <OfficialsFilters
          jurisdictions={jurisdictions}
          value={filters}
          onChange={(next) => pushFilters(next, { page: 0 })}
        />
        <div className="flex w-full max-w-md flex-col gap-2 md:w-auto">
          <label className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--fg-4)]">
            Search
          </label>
          <div className="flex gap-2">
            <Input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Name or slug"
              className="border-[rgba(0,15,34,0.12)] bg-surface"
              onKeyDown={(e) => {
                if (e.key === "Enter") pushFilters(filters, { q: searchDraft, page: 0 });
              }}
            />
            <Button type="button" onClick={() => pushFilters(filters, { q: searchDraft, page: 0 })}>
              Apply
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[rgba(0,15,34,0.08)] bg-surface">
        {listQuery.isLoading ? (
          <p className="p-6 font-sans text-sm text-[var(--fg-3)]">Loading officials…</p>
        ) : listQuery.isError ? (
          <p className="p-6 font-sans text-sm text-destructive">Could not load officials.</p>
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="border-b border-[rgba(0,15,34,0.08)] bg-surface-1 font-sans text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-4 py-3 font-medium">
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[rgba(0,15,34,0.06)] odd:bg-surface even:bg-surface-1/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-[var(--fg-2)]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-sans text-sm text-[var(--fg-3)]">
          {total.toLocaleString()} official{total === 1 ? "" : "s"} · page {page + 1} of {maxPage + 1}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={page <= 0}
            onClick={() => pushFilters(filters, { page: page - 1 })}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={page >= maxPage}
            onClick={() => pushFilters(filters, { page: page + 1 })}
          >
            Next
          </Button>
        </div>
      </div>

      <MutationConfirm
        open={confirmId != null}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Archive this official?"
        description="Soft-deletes the row (sets deleted_at). Operator views hide archived officials."
        confirmLabel="Archive"
        onConfirm={async () => {
          if (confirmId) await deleteMutation.mutateAsync(confirmId);
        }}
        pending={deleteMutation.isPending}
      />
    </div>
  );
}
