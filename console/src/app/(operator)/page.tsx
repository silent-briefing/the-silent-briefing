export default function BriefingHomePage() {
  const when = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date());

  return (
    <div>
      <div className="mb-10 max-w-[720px]">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="h-px w-7 bg-tertiary" aria-hidden />
          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--fg-4)]">
            Morning brief · {when}
          </span>
        </div>
        <h1 className="font-serif text-4xl font-normal leading-[1.05] tracking-[-0.02em] text-[var(--fg-1)] md:text-[56px]">
          The Salt Lake briefing:{" "}
          <em className="italic text-[var(--primary-container)]">District 4</em>{" "}
          operational overview
        </h1>
        <p className="mt-4 max-w-[620px] font-sans text-[17px] leading-relaxed text-[var(--fg-3)]">
          Three new filings require review. Residency discrepancy detected on one
          SD&nbsp;8 candidate. Primary filing window closes Friday at 17:00 MT.
        </p>
      </div>

      <section className="mb-10 grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Active filings",
            value: "14",
            meta: "Across 5 SLCO districts",
            tone: "default" as const,
          },
          {
            label: "Pending vetting",
            value: "03",
            meta: "2 SLCO · 1 Wasatch",
            tone: "accent" as const,
          },
          {
            label: "Filing deadline",
            value: "Fri",
            meta: "17:00 MT · Oct 25",
            tone: "warn" as const,
          },
        ].map((s) => (
          <article
            key={s.label}
            className={[
              "rounded-[var(--radius-lg)] bg-surface-1 p-5 shadow-[var(--shadow-sm)]",
              s.tone === "accent"
                ? "ring-1 ring-[rgba(212,175,55,0.35)]"
                : ""
            ].join(" ")}
          >
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--fg-4)]">
              {s.label}
            </p>
            <p
              className={[
                "mt-2 font-serif text-4xl font-normal tabular-nums text-[var(--fg-1)]",
                s.tone === "warn" ? "text-[var(--status-pending)]" : "",
              ].join(" ")}
            >
              {s.value}
            </p>
            <p className="mt-1 font-sans text-xs text-[var(--fg-3)]">{s.meta}</p>
          </article>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--fg-1)]">
            Priority dossiers
          </span>
          <span className="font-sans text-xs text-[var(--fg-4)]">
            Phase B · live roster
          </span>
        </div>
        <div className="rounded-[var(--radius-lg)] bg-surface-1 p-6 shadow-[var(--shadow-sm)]">
          <p className="font-sans text-sm leading-relaxed text-[var(--fg-3)]">
            Candidate rows, vetting badges, and comparison matrix ship in Phase B.
            This shell follows{" "}
            <code className="rounded bg-surface-2 px-1 font-mono text-[13px]">
              design/ui_kits/operator_console
            </code>{" "}
            — tonal surfaces, gold pinstripe, crimson reserved for signal.
          </p>
        </div>
      </section>
    </div>
  );
}
