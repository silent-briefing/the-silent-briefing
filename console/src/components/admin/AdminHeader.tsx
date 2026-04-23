"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ADMIN_SIDEBAR_ITEMS } from "@/lib/admin/nav-config";
import { cn } from "@/lib/utils";

function deploymentLabel(): string {
  const v = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV?.trim();
  if (v) return v.toUpperCase();
  if (process.env.NODE_ENV === "production") return "PROD";
  return "LOCAL";
}

function labelForPath(pathname: string): string {
  const sorted = [...ADMIN_SIDEBAR_ITEMS].sort((a, b) => b.href.length - a.href.length);
  const hit = sorted.find((it) => pathname === it.href || pathname.startsWith(`${it.href}/`));
  if (hit) return hit.label;
  return "Admin";
}

type Props = {
  trailing?: ReactNode;
};

export function AdminHeader({ trailing }: Props) {
  const pathname = usePathname() ?? "/admin";
  const env = deploymentLabel();
  const current = labelForPath(pathname);

  return (
    <header
      className={cn(
        "sb-topbar-glass flex h-14 shrink-0 items-center justify-between gap-4",
        "border-b border-[rgba(0,15,34,0.06)] px-6 py-2 shadow-[var(--shadow-sm)]",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="font-sans text-[11px] font-bold tracking-[0.2em] text-tertiary uppercase">
          Admin
        </span>
        <nav
          className="flex min-w-0 items-center gap-2 font-sans text-sm text-[var(--fg-3)]"
          aria-label="Breadcrumb"
        >
          <Link
            href="/admin"
            className="shrink-0 font-medium text-[var(--fg-2)] transition-colors hover:text-[var(--fg-1)]"
          >
            Control room
          </Link>
          {pathname !== "/admin" ? (
            <>
              <span className="text-[var(--fg-4)]" aria-hidden>
                /
              </span>
              <span className="truncate font-semibold text-[var(--fg-1)]">{current}</span>
            </>
          ) : null}
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span
          className="font-sans text-[10px] font-bold tracking-[0.22em] text-tertiary uppercase"
          title="Deployment tier"
        >
          {env}
        </span>
        {trailing}
      </div>
    </header>
  );
}
