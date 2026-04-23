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
import { appRoleSchema, type AppRole } from "@/lib/schemas/admin-org-members";
import { z } from "zod";

const inviteResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  app_role: appRoleSchema,
});

function detailFromBffError(body: unknown): string {
  if (body && typeof body === "object" && "detail" in body) {
    const d = (body as { detail?: unknown }).detail;
    if (typeof d === "string") return d;
  }
  return "Request failed";
}

export function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<AppRole>("viewer");
  const [confirmEmail, setConfirmEmail] = React.useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setEmail("");
      setConfirmEmail("");
      setRole("viewer");
    }
    onOpenChange(next);
  };

  const mut = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {
        email: email.trim(),
        app_role: role,
      };
      if (role === "admin") {
        body.confirm_email = confirmEmail.trim();
      }
      return bffJson({
        path: "/v1/admin/users/invitations",
        method: "POST",
        body,
        getToken: () => getToken(),
        schema: inviteResponseSchema,
      });
    },
    onSuccess: () => {
      toast.success("Invitation sent");
      void qc.invalidateQueries({ queryKey: ["admin-org-members"] });
      handleOpenChange(false);
    },
    onError: (e: unknown) => {
      toast.error(e instanceof BffHttpError ? detailFromBffError(e.body) : "Invite failed");
    },
  });

  const submit = () => {
    if (!email.trim()) {
      toast.error("Email required");
      return;
    }
    if (role === "admin" && email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      toast.error("Confirmation email must match for admin invites");
      return;
    }
    mut.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!mut.isPending}>
        <DialogHeader>
          <DialogTitle className="font-serif text-lg text-primary">Invite member</DialogTitle>
          <DialogDescription className="font-sans text-sm text-[var(--fg-3)]">
            Sends a Clerk organization invitation for the active workspace. Choose the app role they should receive after
            they accept.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Email</Label>
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">App role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger className="w-full border-[rgba(0,15,34,0.12)] bg-[var(--surface-1)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="operator">Operator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === "admin" ? (
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">
                Re-type email to confirm admin invite
              </Label>
              <Input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={mut.isPending} onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={mut.isPending} onClick={submit}>
            {mut.isPending ? "Sending…" : "Send invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
