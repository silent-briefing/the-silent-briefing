import { describe, expect, it } from "vitest";

import { bfsLayers, radialPositionsFromLayers, undirectedAdjacency } from "./entity-graph-layout";

describe("entity-graph-layout", () => {
  it("bfsLayers walks undirected edges", () => {
    const adj = undirectedAdjacency([
      { a: "r", b: "a" },
      { a: "r", b: "b" },
      { a: "a", b: "c" },
    ]);
    expect(bfsLayers("r", adj)).toEqual([["r"], ["a", "b"], ["c"]]);
  });

  it("radialPositions assigns center to root", () => {
    const layers = [["root"], ["a", "b"]];
    const pos = radialPositionsFromLayers(layers, { cx: 100, cy: 50, radiusStep: 80 });
    expect(pos.get("root")).toEqual({ x: 100, y: 50 });
    expect(pos.get("a")).toBeDefined();
    expect(pos.get("b")).toBeDefined();
  });
});
