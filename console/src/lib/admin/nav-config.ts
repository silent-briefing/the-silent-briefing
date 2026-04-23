import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Cog,
  FileSearch,
  GitBranch,
  LayoutDashboard,
  Newspaper,
  Radio,
  Rss,
  Scale,
  Settings,
  UserCog,
  Users,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: "exact" | "prefix";
  description: string;
};

const overview: AdminNavItem = {
  href: "/admin",
  label: "Overview",
  icon: LayoutDashboard,
  match: "exact",
  description: "Dashboard tiles and fleet health at a glance.",
};

/** Phase C admin concerns — paths match `2026-04-20-gui-phase-c-admin-console.md` task C.1 (+ C.6 feeds). */
export const ADMIN_PHASE_C_CONCERNS: AdminNavItem[] = [
  {
    href: "/admin/officials",
    label: "Officials",
    icon: Users,
    description: "Roster CRUD, slugs, jurisdictions, retention.",
  },
  {
    href: "/admin/dossiers",
    label: "Dossiers & claims",
    icon: FileSearch,
    description: "Human review queue, publish, groundedness.",
  },
  {
    href: "/admin/runs",
    label: "Intel runs",
    icon: Radio,
    description: "Observability and manual job triggers.",
  },
  {
    href: "/admin/correlations",
    label: "Correlations",
    icon: GitBranch,
    description: "Proposed entity edges — accept or reject.",
  },
  {
    href: "/admin/sources",
    label: "Sources",
    icon: BookOpen,
    description: "Scraper and civic API URL overrides in public.settings.",
  },
  {
    href: "/admin/feeds",
    label: "Feeds",
    icon: Rss,
    description: "X + Perplexity aggregation, cache TTL, per-official opt-outs.",
  },
  {
    href: "/admin/users",
    label: "Users & roles",
    icon: UserCog,
    description: "Clerk organization members and roles.",
  },
  {
    href: "/admin/opinions",
    label: "Opinions & bills",
    icon: Scale,
    description: "PDF ingestion, chunks, and bill links.",
  },
  {
    href: "/admin/media",
    label: "Media coverage",
    icon: Newspaper,
    description: "Curate headlines and outlets.",
  },
  {
    href: "/admin/ops",
    label: "Engine ops",
    icon: Cog,
    description: "Health, quotas, and data-quality signals.",
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    description: "Model tiers, flags, staleness, cache TTLs.",
  },
];

/** Sidebar: overview home + ten concerns. */
export const ADMIN_SIDEBAR_ITEMS: AdminNavItem[] = [overview, ...ADMIN_PHASE_C_CONCERNS];
