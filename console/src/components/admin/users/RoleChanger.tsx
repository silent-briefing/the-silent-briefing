"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BffHttpError, bffJson } from "@/lib/bff/client";
import { type AppRole, type OrgMemberRow } from "@/lib/schemas/admin-org-members";
import { z } from "zod";

const patchResponseSchema = z.object({
  user_id: z.string(),
  app_role: z.enum(["admin", "operator", "viewer"]),
});

function detailFromBffError(body: unknown): string {
  if (body && typeof body === "object" && "detail" in body) {
    const d = (body as { detail?: unknown }).detail;
    if (typeof d === "string") return d;
  }
  return "Request failed";
}

export function RoleChanger({
  member,
  disabled,
  className,
}: {
  member: OrgMemberRow;
  disabled?: boolean;
  className?: string;
}) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const [selectValue, setSelectValue] = React.useState<AppRole>(() => member.app_role);

  const [promoteOpen, setPromoteOpen] = React.useState(false);
  const [confirmEmail, setConfirmEmail] = React.useState("");

  const mut = useMutation({
    mutationFn: async (body: { app_role: AppRole; confirm_target_email?: string }) =>
      bffJson({
        path: `/v1/admin/users/members/${encodeURIComponent(member.user_id)}`,
        method: "PATCH",
        body,
        getToken: () => getToken(),
        schema: patchResponseSchema,
      }),
    onSuccess: (_data, variables) => {
      toast.success("Role updated");
      setSelectValue(variables.app_role);
      void qc.invalidateQueries({ queryKey: ["admin-org-members"] });
      setPromoteOpen(false);
      setConfirmEmail("");
    },
    onError: (e: unknown) => {
      toast.error(e instanceof BffHttpError ? detailFromBffError(e.body) : "Update failed");
    },
  });

  const onSelectChange = (next: AppRole) => {
    if (next === member.app_role) {
      setSelectValue(next);
      return;
    }
    if (next === "admin" && member.app_role !== "admin") {
      setConfirmEmail("");
      setPromoteOpen(true);
      return;
    }
    setSelectValue(next);
    mut.mutate({ app_role: next });
  };

  const submitPromote = () => {
    const target = (member.email ?? "").trim().toLowerCase();
    if (!target || confirmEmail.trim().toLowerCase() !== target) {
      toast.error("Type the member's primary email exactly to promote to admin.");
      return;
    }
    mut.mutate({ app_role: "admin", confirm_target_email: confirmEmail.trim() });
  };

  return (
    <div className={className}>
      <Select
        value={selectValue}
        onValueChange={(v) => onSelectChange(v as AppRole)}
        disabled={disabled || mut.isPending}
      >
        <SelectTrigger className="h-8 min-w-[8.5rem] border-[rgba(0,15,34,0.12)] bg-[var(--surface-1)] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="viewer">Viewer</SelectItem>
          <SelectItem value="operator">Operator</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
        </SelectContent>
      </Select>

      <Dialog
        open={promoteOpen}
        onOpenChange={(o) => {
          setPromoteOpen(o);
          if (!o) setConfirmEmail("");
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!mut.isPending}>
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-primary">Promote to admin</DialogTitle>
            <DialogDescription className="font-sans text-sm text-[var(--fg-3)]">
              Grants Clerk <span className="font-mono">org:admin</span> and app <span className="font-mono">admin</span>{" "}
              on the user. Re-enter their primary email to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Member email</Label>
            <Input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="font-mono text-sm"
              autoComplete="off"
              placeholder={member.email ?? "email unknown"}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={mut.isPending} onClick={() => setPromoteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={mut.isPending} onClick={submitPromote}>
              {mut.isPending ? "Saving…" : "Promote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
