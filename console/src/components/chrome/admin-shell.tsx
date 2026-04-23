"use client";

import { UserButton } from "@clerk/nextjs";
import type { ReactNode } from "react";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminNav } from "@/components/admin/AdminNav";

import { AuditLogFooter } from "./AuditLogFooter";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1">
      <AdminNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface">
        <AdminHeader trailing={<UserButton />} />
        <main
          id="site-main"
          tabIndex={-1}
          className="min-h-0 flex-1 overflow-y-auto px-6 py-8 outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4"
        >
          {children}
        </main>
        <AuditLogFooter />
      </div>
    </div>
  );
}
