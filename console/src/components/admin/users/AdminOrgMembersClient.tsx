"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import { MutationConfirm } from "@/components/admin/MutationConfirm";
import { InviteDialog } from "@/components/admin/users/InviteDialog";
import { RoleChanger } from "@/components/admin/users/RoleChanger";
import { Button } from "@/components/ui/button";
import { BffHttpError, bffJson } from "@/lib/bff/client";
import { orgMembersListResponseSchema, type OrgMemberRow } from "@/lib/schemas/admin-org-members";
import { cn } from "@/lib/utils";
import { z } from "zod";

function detailFromBffError(body: unknown): string {
  if (body && typeof body === "object" && "detail" in body) {
    const d = (body as { detail?: unknown }).detail;
    if (typeof d === "string") return d;
  }
  return "Request failed";
}

function roleBadgeClass(role: string): string {
  if (role === "admin") return "bg-[var(--secondary)]/15 text-[var(--secondary)]";
  if (role === "operator") return "bg-primary/10 text-primary";
  return "bg-[var(--surface-2)] text-[var(--fg-3)]";
}

export function AdminOrgMembersClient({ className }: { className?: string }) {
  const { getToken, userId } = useAuth();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [removeTarget, setRemoveTarget] = React.useState<OrgMemberRow | null>(null);

  const listQ = useQuery({
    queryKey: ["admin-org-members"],
    queryFn: () =>
      bffJson({
        path: "/v1/admin/users/members",
        getToken: () => getToken(),
        schema: orgMembersListResponseSchema,
      }),
  });

  const removeMut = useMutation({
    mutationFn: async (uid: string) =>
      bffJson({
        path: `/v1/admin/users/members/${encodeURIComponent(uid)}`,
        method: "DELETE",
        getToken: () => getToken(),
        schema: z.object({ user_id: z.string(), removed: z.string() }),
      }),
    onSuccess: () => {
      toast.success("Member removed from organization");
      void qc.invalidateQueries({ queryKey: ["admin-org-members"] });
      setRemoveTarget(null);
    },
    onError: (e: unknown) => {
      toast.error(e instanceof BffHttpError ? detailFromBffError(e.body) : "Remove failed");
    },
  });

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => setInviteOpen(true)}>
          Invite member
        </Button>
        <p className="font-sans text-xs text-[var(--fg-3)]">
          Requires an active Clerk organization and <span className="font-mono">CLERK_SECRET_KEY</span> on the API.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] font-sans text-[10px] uppercase tracking-[0.14em] text-[var(--fg-4)]">
              <th className="px-3 py-2 font-medium">Member</th>
              <th className="px-3 py-2 font-medium">App role</th>
              <th className="px-3 py-2 font-medium">Clerk org role</th>
              <th className="px-3 py-2 font-medium">Change role</th>
              <th className="px-3 py-2 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {(listQ.data?.items ?? []).map((row) => {
              const isSelf = Boolean(userId && row.user_id === userId);
              const name =
                [row.first_name, row.last_name].filter(Boolean).join(" ") || row.email || row.user_id;
              return (
                <tr key={row.user_id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-1)]">
                  <td className="px-3 py-2">
                    <p className="font-medium text-primary">{name}</p>
                    <p className="mt-1 font-mono text-[10px] text-[var(--fg-4)]">{row.email ?? "—"}</p>
                    <p className="font-mono text-[10px] text-[var(--fg-4)]">{row.user_id}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-[0.12em]",
                        roleBadgeClass(row.app_role),
                      )}
                    >
                      {row.app_role}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-[var(--fg-2)]">{row.clerk_org_role}</td>
                  <td className="px-3 py-2">
                    <RoleChanger key={`${row.user_id}-${row.app_role}`} member={row} disabled={isSelf} />
                    {isSelf ? (
                      <p className="mt-1 font-sans text-[10px] text-[var(--fg-4)]">You cannot edit your own role here.</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-[var(--secondary)]/40 text-[var(--secondary)]"
                      disabled={isSelf || removeMut.isPending}
                      onClick={() => setRemoveTarget(row)}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {listQ.isLoading ? <p className="text-sm text-[var(--fg-3)]">Loading…</p> : null}
      {listQ.error ? (
        <p className="text-sm text-[var(--secondary)]">
          {listQ.error instanceof Error ? listQ.error.message : "Failed to load members"}
        </p>
      ) : null}

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      <MutationConfirm
        open={removeTarget !== null}
        onOpenChange={(o) => {
          if (!o) setRemoveTarget(null);
        }}
        title="Remove from organization"
        description={
          removeTarget ? (
            <span>
              Remove <strong>{removeTarget.email ?? removeTarget.user_id}</strong> from this Clerk organization? Their
              user account remains in Clerk.
            </span>
          ) : (
            ""
          )
        }
        confirmLabel="Remove"
        pending={removeMut.isPending}
        onConfirm={async () => {
          if (!removeTarget) return;
          await removeMut.mutateAsync(removeTarget.user_id);
        }}
      />
    </div>
  );
}
