import { describe, expect, it } from "vitest";

import {
  extractCritiqueForDisplay,
  extractSynthesisForDisplay,
  formatGroundednessLabel,
} from "./adversarial-display";

describe("adversarial-display", () => {
  it("formats groundedness", () => {
    expect(formatGroundednessLabel("0.88")).toBe("88%");
    expect(formatGroundednessLabel(null)).toBe("—");
  });

  it("extracts critique text", () => {
    expect(extractCritiqueForDisplay({ critique_text: " Weak sourcing " })).toBe("Weak sourcing");
  });

  it("pretty-prints critique_json object", () => {
    const s = extractCritiqueForDisplay({ critique_json: '{"issues":[]}' });
    expect(s).toContain("issues");
  });

  it("extracts synthesis", () => {
    expect(extractSynthesisForDisplay({ final_dossier: "Done." })).toBe("Done.");
  });
});
