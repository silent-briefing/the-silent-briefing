/** 32px audit strip — navy surface, mono microlabels (design system). */
export function AuditLogFooter() {
  return (
    <footer
      className="flex h-8 shrink-0 items-center justify-between bg-primary px-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-inv-3)]"
      aria-label="Audit context"
    >
      <span>Session • UTC</span>
      <span>Audit trail • Phase B</span>
    </footer>
  );
}
