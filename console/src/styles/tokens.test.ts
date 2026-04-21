import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const designCss = join(here, "../../../design/colors_and_type.css");

describe("design tokens", () => {
  it("preserves primary navy anchor", () => {
    const src = readFileSync(designCss, "utf8");
    expect(src).toMatch(/--primary:\s*#000f22/i);
  });
});
