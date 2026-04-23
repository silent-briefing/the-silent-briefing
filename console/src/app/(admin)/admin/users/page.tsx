import { Suspense } from "react";

import { AdminOrgMembersClient } from "@/components/admin/users/AdminOrgMembersClient";

export default function AdminUsersPage() {
  return (
    <div>
      <p className="font-sans text-sm uppercase tracking-[0.2em] text-[var(--fg-4)]">Admin</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-primary">Users & roles</h1>
      <p className="mt-3 max-w-prose font-sans text-sm leading-relaxed text-[var(--fg-3)]">
        Manage Clerk organization memberships for the workspace you have active in the session. App roles (
        <span className="font-mono">viewer</span>, <span className="font-mono">operator</span>,{" "}
        <span className="font-mono">admin</span>) are stored on user <span className="font-mono">public_metadata</span>{" "}
        and aligned with Clerk <span className="font-mono">org:admin</span> for full admins.
      </p>
      <Suspense fallback={<p className="mt-10 font-sans text-sm text-[var(--fg-3)]">Loading…</p>}>
        <AdminOrgMembersClient className="mt-10" />
      </Suspense>
    </div>
  );
}
