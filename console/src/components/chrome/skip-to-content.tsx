import { cn } from "@/lib/utils";

/** First focusable control in the document; targets `#site-main` (see operator/admin/sign-in layouts). */
export function SkipToContent() {
  return (
    <a
      href="#site-main"
      className={cn(
        "fixed left-4 top-4 z-[9999] rounded-md bg-primary px-4 py-2",
        "font-sans text-xs font-bold uppercase tracking-[0.18em] text-[var(--on-primary)] shadow-md",
        "pointer-events-none opacity-0 transition-opacity duration-200",
        "focus:pointer-events-auto focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4 focus-visible:ring-offset-surface",
        "motion-reduce:transition-none",
      )}
    >
      Skip to main content
    </a>
  );
}
