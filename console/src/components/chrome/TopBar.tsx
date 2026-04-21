import type { ReactNode } from "react";

type Props = {
  title: string;
  /** When set, shows gold UPPERCASE tracked badge (admin shell). */
  badge?: "ADMIN";
  trailing?: ReactNode;
};

export function TopBar({ title, badge, trailing }: Props) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between bg-surface-container-low px-6 shadow-[var(--shadow-sm)]">
      <div className="flex min-w-0 items-baseline gap-4">
        {badge ? (
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-tertiary">
            {badge}
          </span>
        ) : null}
        <h1 className="truncate font-serif text-xl font-semibold tracking-tight text-primary md:text-2xl">
          {title}
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-3">{trailing}</div>
    </header>
  );
}
