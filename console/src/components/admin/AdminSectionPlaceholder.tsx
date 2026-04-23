type Props = {
  title: string;
  /** Upcoming Phase C task id, e.g. `C.2`. */
  phase: string;
};

/** Stub body until the matching Phase C task ships CRUD/review UI. */
export function AdminSectionPlaceholder({ title, phase }: Props) {
  return (
    <div className="max-w-2xl">
      <p className="font-sans text-sm uppercase tracking-[0.2em] text-[var(--fg-4)]">{title}</p>
      <h1 className="mt-3 font-serif text-3xl font-semibold text-primary">{title}</h1>
      <p className="mt-4 font-sans text-base leading-relaxed text-[var(--fg-3)]">
        This surface ships in Phase {phase}. Admin mutations will run through the FastAPI BFF with
        an admin_audit_log row on every write.
      </p>
    </div>
  );
}
