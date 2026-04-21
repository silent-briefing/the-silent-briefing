"use client";

import { UserButton } from "@clerk/nextjs";
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
import { Sidebar, type SidebarItem } from "./Sidebar";
import { TopBar } from "./TopBar";

const operatorNav: SidebarItem[] = [
  { href: "/", label: "Briefing", icon: LayoutDashboard, match: "exact" },
  { href: "/judicial", label: "Judicial", icon: Gavel, enabled: false },
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
          subtitle: "Utah political intelligence",
        }}
        items={operatorNav}
        aria-label="Operator navigation"
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface">
        <TopBar
          title="Morning brief"
          trailing={<UserButton />}
        />
        <main className="min-h-0 flex-1 overflow-y-auto px-6 py-8">{children}</main>
        <AuditLogFooter />
      </div>
    </div>
  );
}
