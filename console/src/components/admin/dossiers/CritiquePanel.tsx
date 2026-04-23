"use client";

import type { ClaimDetail } from "@/lib/schemas/admin-dossier";
import { cn } from "@/lib/utils";

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

export function CritiquePanel({ claim, className }: { claim: ClaimDetail | null; className?: string }) {
  const c = claim?.critique;
  if (!claim) {
    return (
      <div className={cn("rounded-[var(--radius-lg)] border border-dashed border-[rgba(0,15,34,0.12)] p-6", className)}>
        <p className="font-sans text-sm text-[var(--fg-3)]">Select a claim to view adversarial critique.</p>
      </div>
    );
  }
  if (!c || Object.keys(c).length === 0) {
    return (
      <div className={cn("rounded-[var(--radius-lg)] border border-[rgba(0,15,34,0.08)] bg-surface p-6", className)}>
        <p className="font-sans text-sm text-[var(--fg-3)]">No critique JSON on this claim (not from adversarial pipeline).</p>
      </div>
    );
  }

  const issues = asStringArray(c.issues);
  const unsupported = asStringArray(c.unsupported_claims);
  const severity = typeof c.severity === "string" ? c.severity : "—";

  return (
    <div
      className={cn(
        "space-y-4 rounded-[var(--radius-lg)] border border-[rgba(0,15,34,0.08)] bg-surface p-6",
        className,
      )}
    >
      <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--fg-4)]">
        Adversarial critique
      </p>
      <p className="font-sans text-sm text-[var(--fg-3)]">
        Severity:{" "}
        <span className="font-medium text-[var(--fg-1)]">{severity}</span>
      </p>
      <div>
        <p className="mb-2 font-sans text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Issues</p>
        <ul className="list-inside list-disc space-y-1 font-sans text-sm text-[var(--fg-2)]">
          {issues.length ? issues.map((t) => <li key={t}>{t}</li>) : <li className="text-[var(--fg-3)]">None listed</li>}
        </ul>
      </div>
      <div>
        <p className="mb-2 font-sans text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">
          Unsupported claims
        </p>
        <ul className="list-inside list-disc space-y-1 font-sans text-sm text-[var(--fg-2)]">
          {unsupported.length ? (
            unsupported.map((t) => <li key={t}>{t}</li>)
          ) : (
            <li className="text-[var(--fg-3)]">None listed</li>
          )}
        </ul>
      </div>
    </div>
  );
}
