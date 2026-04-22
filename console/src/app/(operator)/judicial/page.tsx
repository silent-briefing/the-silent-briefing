import Link from "next/link";
import { Landmark, Scale, Building2 } from "lucide-react";

const hubs = [
  {
    href: "/judicial/supreme-court",
    title: "Supreme Court",
    blurb: "Utah Supreme Court justices and retention context.",
    icon: Scale,
  },
  {
    href: "/judicial/court-of-appeals",
    title: "Court of Appeals",
    blurb: "Appellate judges seated in Utah.",
    icon: Landmark,
  },
  {
    href: "/judicial/district",
    title: "District Courts",
    blurb: "State district judges — filter by district in a later tranche.",
    icon: Building2,
  },
] as const;

export default function JudicialWatchLandingPage() {
  return (
    <div>
      <p className="font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--fg-4)]">
        Judicial watch
      </p>
      <h1 className="mt-3 font-serif text-3xl font-normal text-[var(--fg-1)] md:text-4xl">
        Utah courts
      </h1>
      <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-[var(--fg-3)]">
        Cross-linked rosters per Palantir-style navigation. Pick a court; dossiers open from each
        justice card.
      </p>
      <p className="mt-6 max-w-2xl font-sans text-xs leading-relaxed text-[var(--fg-4)]">
        Each card navigates to a Utah-scoped roster. If you land on a page with no names, the UI is
        still working — local Supabase likely needs judicial extraction or RLS/JWT configuration (see
        the empty-state checklist on that page).
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hubs.map(({ href, title, blurb, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              prefetch
              className="group flex h-full flex-col rounded-[var(--radius-lg)] bg-surface-1 p-6 shadow-[var(--shadow-sm)] ring-1 ring-transparent transition-shadow hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--surface)]"
            >
              <Icon
                className="size-6 text-[var(--fg-4)] transition-colors group-hover:text-tertiary"
                strokeWidth={1.5}
                aria-hidden
              />
              <span className="mt-4 font-serif text-xl font-medium text-[var(--fg-1)]">{title}</span>
              <span className="mt-2 font-sans text-sm leading-relaxed text-[var(--fg-3)]">{blurb}</span>
              <span className="mt-4 font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-tertiary">
                Open roster →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
