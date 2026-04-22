"use client";

import {
  Archive,
  FileText,
  GitCompare,
  Gavel,
  LayoutDashboard,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { AuditLogFooter } from "./AuditLogFooter";
import { OperatorTopBar } from "./operator-top-bar";
import { Sidebar, type SidebarItem } from "./Sidebar";

const operatorNav: SidebarItem[] = [
  { href: "/", label: "Briefing", icon: LayoutDashboard, match: "exact" },
  { href: "/judicial", label: "Judicial", icon: Gavel },
  { href: "/officials", label: "Officials", icon: Users, enabled: false },
  { href: "/dossiers", label: "Dossiers", icon: FileText, enabled: false },
  { href: "/compare", label: "Compare", icon: GitCompare, enabled: false },
  { href: "/archives", label: "Archives", icon: Archive, enabled: false },
];

export function OperatorShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1">
      <Sidebar
        brand={{
          title: "The Silent Briefing",
          subtitle: "Candidate intelligence · Utah",
        }}
        items={operatorNav}
        aria-label="Operator navigation"
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface">
        <OperatorTopBar />
        <main className="min-h-0 flex-1 overflow-y-auto px-8 py-10 md:px-14 md:py-12">
          <div className="mx-auto max-w-[1200px]">{children}</div>
        </main>
        <AuditLogFooter />
      </div>
    </div>
  );
}
