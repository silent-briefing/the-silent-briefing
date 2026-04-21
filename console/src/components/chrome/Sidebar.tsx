"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export type SidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** When false, rendered as non-link placeholder (Phase B route). */
  enabled?: boolean;
  /** Default: `/` is exact; other paths use prefix match. Set `exact` for e.g. `/admin` overview only. */
  match?: "exact" | "prefix";
};

type Props = {
  brand: { title: string; subtitle: string };
  items: SidebarItem[];
  "aria-label"?: string;
};

export function Sidebar({ brand, items, "aria-label": ariaLabel }: Props) {
  const pathname = usePathname();

  return (
    <aside
      className="flex w-[260px] shrink-0 flex-col bg-primary text-[var(--on-primary)]"
      aria-label={ariaLabel ?? "Primary navigation"}
    >
      <div className="bg-[color-mix(in_oklab,var(--primary-container)_88%,transparent)] px-5 py-6">
        <p className="font-serif text-lg font-semibold leading-tight text-[var(--on-primary)]">
          {brand.title}
        </p>
        <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.2em] text-[var(--fg-inv-3)]">
          {brand.subtitle}
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label={ariaLabel}>
        {items.map((it) => {
          const Icon = it.icon;
          const active =
            it.enabled !== false &&
            (() => {
              if (it.match === "exact") return pathname === it.href;
              if (it.href === "/") return pathname === "/";
              return (
                pathname === it.href || pathname.startsWith(`${it.href}/`)
              );
            })();
          const base =
            "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4 focus-visible:ring-offset-primary";
          const activeCls = active
            ? "bg-[rgba(251,249,245,0.08)] text-[var(--on-primary)]"
            : "text-[var(--fg-inv-2)] hover:bg-[rgba(251,249,245,0.06)]";
          const muted = it.enabled === false;

          if (muted) {
            return (
              <span
                key={it.label}
                className={`${base} cursor-not-allowed opacity-45`}
                title="Coming in Phase B"
              >
                <Icon className="size-6 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
                {it.label}
              </span>
            );
          }

          return (
            <Link
              key={it.href}
              href={it.href}
              className={`${base} ${activeCls}`}
              prefetch={it.href !== "/"}
            >
              <Icon className="size-6 shrink-0" strokeWidth={1.5} aria-hidden />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
