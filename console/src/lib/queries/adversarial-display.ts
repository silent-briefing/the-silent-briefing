/** Extract human-readable strings from heterogeneous `dossier_claims.metadata` (writer vs adversarial pipelines). */

function firstStringField(meta: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = meta[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export function formatGroundednessLabel(raw: string | null | undefined): string {
  if (raw == null || !String(raw).trim()) return "—";
  const n = Number.parseFloat(String(raw));
  if (Number.isFinite(n)) return `${Math.round(n * 100)}%`;
  return String(raw).trim();
}

export function extractCritiqueForDisplay(metadata: Record<string, unknown>): string | null {
  const direct = firstStringField(metadata, ["critique_text", "critique_summary", "critique"]);
  if (direct) return direct;
  const cj = metadata.critique_json;
  if (typeof cj === "string" && cj.trim()) {
    try {
      const o = JSON.parse(cj) as unknown;
      if (o && typeof o === "object") return JSON.stringify(o, null, 2);
      return cj.trim();
    } catch {
      return cj.trim();
    }
  }
  return null;
}

export function extractSynthesisForDisplay(metadata: Record<string, unknown>): string | null {
  return firstStringField(metadata, ["synthesis", "final_dossier", "synthesized_text", "merged_draft"]);
}
