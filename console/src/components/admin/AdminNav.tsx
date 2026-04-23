"use client";

import { Sidebar, type SidebarItem } from "@/components/chrome/Sidebar";
import { ADMIN_SIDEBAR_ITEMS } from "@/lib/admin/nav-config";

const items: SidebarItem[] = ADMIN_SIDEBAR_ITEMS.map((it) => ({
  href: it.href,
  label: it.label,
  icon: it.icon,
  match: it.match,
  enabled: true,
  iconSize: "md",
}));

export function AdminNav() {
  return (
    <Sidebar
      brand={{ title: "Administration", subtitle: "Silent Briefing" }}
      items={items}
      aria-label="Admin navigation"
    />
  );
}
