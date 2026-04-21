export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-sans text-sm uppercase tracking-[0.2em] text-[var(--fg-4)]">
        Admin dashboard
      </p>
      <p className="mt-4 font-serif text-2xl font-semibold text-primary">
        Operations and curation
      </p>
      <p className="mt-3 max-w-prose font-sans text-base leading-relaxed text-[var(--fg-3)]">
        Phase C connects CRUD, review queues, and engine controls here. Audit
        logging and role gates run through the FastAPI BFF.
      </p>
    </div>
  );
}
