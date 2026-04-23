"use client";

import {
  Archive,
  Bell,
  Bookmark,
  FileText,
  GitBranch,
  GitCompare,
  Gavel,
  LayoutDashboard,
  Search,
  Users,
} from "lucide-react";
import * as React from "react";

import { GlobalSearchPalette } from "@/components/operator/search/GlobalSearchPalette";

import { AuditLogFooter } from "./AuditLogFooter";
import { OperatorTopBar } from "./operator-top-bar";
import { Sidebar, type SidebarItem } from "./Sidebar";

const operatorNav: SidebarItem[] = [
  { href: "/", label: "Briefing", icon: LayoutDashboard, match: "exact" },
  { href: "/judicial", label: "Judicial", icon: Gavel },
  { href: "/graph", label: "Graph", icon: GitBranch },
  { href: "/officials", label: "Officials", icon: Users },
  { href: "/search", label: "Search", icon: Search },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/admin/dossiers", label: "Dossiers", icon: FileText },
  { href: "/compare", label: "Compare", icon: GitCompare },
  {
    href: "/archives",
    label: "Archives",
    icon: Archive,
    enabled: false,
    disabledTitle: "Not yet available",
  },
];

export function OperatorShell({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const openSearch = React.useCallback(() => setSearchOpen(true), []);

  return (
    <div className="flex min-h-0 flex-1">
      <GlobalSearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <Sidebar
        brand={{
          title: "The Silent Briefing",
          subtitle: "Candidate intelligence · Utah",
        }}
        items={operatorNav}
        aria-label="Operator navigation"
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface">
        <OperatorTopBar onOpenSearch={openSearch} />
        <main
          id="site-main"
          tabIndex={-1}
          className="min-h-0 flex-1 overflow-y-auto px-8 py-10 outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4 md:px-14 md:py-12"
        >
          <div className="mx-auto max-w-[1200px]">{children}</div>
        </main>
        <AuditLogFooter />
      </div>
    </div>
  );
}
