import Link from "next/link";

import { ADMIN_PHASE_C_CONCERNS } from "@/lib/admin/nav-config";
import type { AdminDashboardStats } from "@/lib/admin/dashboard-stats";
import { cn } from "@/lib/utils";

function tileBadge(href: string, stats: AdminDashboardStats): { label: string; tone: "gold" | "crimson" | "neutral" } | null {
  if (href === "/admin/dossiers" && stats.claimsNeedReview > 0) {
    return { label: `${stats.claimsNeedReview} need review`, tone: "crimson" };
  }
  if (href === "/admin/correlations" && stats.proposedEdges > 0) {
    return { label: `${stats.proposedEdges} proposed`, tone: "gold" };
  }
  if (href === "/admin/officials") {
    return { label: `${stats.officialsActive} active`, tone: "neutral" };
  }
  return null;
}

export function AdminDashboardTiles({ stats }: { stats: AdminDashboardStats }) {
  return (
    <ul className="mt-10 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
      {ADMIN_PHASE_C_CONCERNS.map((it) => {
        const Icon = it.icon;
        const badge = tileBadge(it.href, stats);
        return (
          <li key={it.href}>
            <Link
              href={it.href}
              className={cn(
                "group flex h-full flex-col rounded-[var(--radius-lg)] bg-surface-1 p-5 shadow-[var(--shadow-sm)]",
                "transition-shadow duration-200 hover:shadow-[var(--shadow-md)]",
                "outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Icon className="size-5 shrink-0 text-tertiary" strokeWidth={1.5} aria-hidden />
                  <span className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-[var(--fg-1)]">
                    {it.label}
                  </span>
                </div>
                {badge ? (
                  <span
                    className={cn(
                      "shrink-0 font-sans text-[10px] font-bold uppercase tracking-[0.18em]",
                      badge.tone === "crimson" && "text-[var(--secondary)]",
                      badge.tone === "gold" && "text-tertiary",
                      badge.tone === "neutral" && "text-[var(--fg-4)]",
                    )}
                  >
                    {badge.label}
                  </span>
                ) : null}
              </div>
              <p className="mt-4 font-sans text-sm leading-relaxed text-[var(--fg-3)]">{it.description}</p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
