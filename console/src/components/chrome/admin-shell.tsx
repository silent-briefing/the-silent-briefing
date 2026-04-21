"use client";

import { UserButton } from "@clerk/nextjs";
import {
  Bell,
  BookOpen,
  Cog,
  FileSearch,
  GitBranch,
  Newspaper,
  Radio,
  Scale,
  Settings,
  UserCog,
  Users,
  Workflow,
} from "lucide-react";
import type { ReactNode } from "react";
import { AuditLogFooter } from "./AuditLogFooter";
import { Sidebar, type SidebarItem } from "./Sidebar";
import { AdminTopBar } from "./TopBar";

/** Admin concern labels — full workflows land in Phase C; nav is structural only. */
const adminNav: SidebarItem[] = [
  { href: "/admin", label: "Overview", icon: Workflow, match: "exact" },
  { href: "/admin/officials", label: "Officials", icon: Users, enabled: false },
  { href: "/admin/dossiers", label: "Dossiers", icon: FileSearch, enabled: false },
  { href: "/admin/intel", label: "Intel runs", icon: Radio, enabled: false },
  { href: "/admin/correlations", label: "Correlations", icon: GitBranch, enabled: false },
  { href: "/admin/sources", label: "Sources", icon: BookOpen, enabled: false },
  { href: "/admin/users", label: "Users", icon: UserCog, enabled: false },
  { href: "/admin/bills", label: "Bills", icon: Scale, enabled: false },
  { href: "/admin/media", label: "Media", icon: Newspaper, enabled: false },
  { href: "/admin/engine", label: "Engine", icon: Cog, enabled: false },
  { href: "/admin/alerts", label: "Alerts", icon: Bell, enabled: false },
  { href: "/admin/settings", label: "Settings", icon: Settings, enabled: false },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1">
      <Sidebar
        brand={{ title: "Administration", subtitle: "Silent Briefing" }}
        items={adminNav}
        aria-label="Admin navigation"
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface">
        <AdminTopBar
          badge="ADMIN"
          title="Control room"
          trailing={<UserButton />}
        />
        <main className="min-h-0 flex-1 overflow-y-auto px-6 py-8">{children}</main>
        <AuditLogFooter />
      </div>
    </div>
  );
}
