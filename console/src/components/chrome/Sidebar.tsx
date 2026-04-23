"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export type SidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** When false, rendered as a non-link placeholder. */
  enabled?: boolean;
  /** Tooltip when `enabled === false` (defaults to “Coming soon”). */
  disabledTitle?: string;
  /** Default: `/` is exact; other paths use prefix match. Set `exact` for e.g. `/admin` overview only. */
  match?: "exact" | "prefix";
  /** Lucide icon box: default 18px (operator); `md` = 20px (Phase C admin nav). */
  iconSize?: "default" | "md";
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
      className="sb-sidebar-pattern flex w-[256px] shrink-0 flex-col border-r border-[rgba(212,175,55,0.1)] text-[var(--on-primary)]"
      aria-label={ariaLabel ?? "Primary navigation"}
    >
      <div className="flex gap-3.5 px-6 pb-7 pt-7">
        <Image
          src="/branding/shield-crest.png"
          alt=""
          width={112}
          height={112}
          quality={100}
          sizes="56px"
          className="h-14 w-14 shrink-0 object-contain opacity-[0.92]"
          priority
        />
        <div className="min-w-0">
          <p className="font-serif text-[19px] font-semibold leading-[1.15] tracking-[-0.01em] text-[var(--fg-inv-1)]">
            {brand.title}
          </p>
          <p className="mt-1 font-sans text-[9px] font-bold uppercase tracking-[0.25em] text-tertiary">
            {brand.subtitle}
          </p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label={ariaLabel}>
        {items.map((it) => {
          const Icon = it.icon;
          const iconCls =
            it.iconSize === "md" ? "size-5 shrink-0" : "size-[18px] shrink-0";
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
            "flex items-center gap-3 border-l-2 border-transparent py-3 pl-3.5 pr-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--primary-container)]";
          const activeCls = active
            ? "border-tertiary bg-[rgba(255,255,255,0.05)] text-tertiary"
            : "text-[var(--fg-inv-2)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--fg-inv-1)]";
          const muted = it.enabled === false;

          if (muted) {
            return (
              <span
                key={it.label}
                className={`${base} cursor-not-allowed opacity-45`}
                title={it.disabledTitle ?? "Coming soon"}
              >
                <Icon className={`${iconCls} opacity-90`} strokeWidth={1.5} aria-hidden />
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
              <Icon className={iconCls} strokeWidth={1.5} aria-hidden />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-[rgba(212,175,55,0.1)] px-6 py-6">
        <p className="font-sans text-[9px] font-bold uppercase tracking-[0.25em] text-[var(--fg-inv-3)]">
          Extraction pipeline
        </p>
        <p className="mt-2 flex items-center gap-2 font-sans text-[9px] font-bold uppercase tracking-[0.25em] text-[var(--fg-inv-3)]">
          <span
            className="inline-block size-1.5 rounded-full bg-[#4eb87e] shadow-[0_0_8px_rgba(78,184,126,0.6)]"
            aria-hidden
          />
          Online
        </p>
      </div>
    </aside>
  );
}
