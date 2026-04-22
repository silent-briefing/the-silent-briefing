/** Undirected BFS layers from root for radial layout. */

export function undirectedAdjacency(
  pairs: readonly { readonly a: string; readonly b: string }[],
): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  const add = (u: string, v: string) => {
    if (!adj.has(u)) adj.set(u, new Set());
    if (!adj.has(v)) adj.set(v, new Set());
    adj.get(u)!.add(v);
    adj.get(v)!.add(u);
  };
  for (const { a, b } of pairs) add(a, b);
  return adj;
}

export function bfsLayers(rootId: string, adj: Map<string, Set<string>>): string[][] {
  const layers: string[][] = [];
  const seen = new Set<string>();
  let frontier = [rootId];
  seen.add(rootId);
  layers.push([rootId]);

  while (frontier.length > 0) {
    const next: string[] = [];
    for (const u of frontier) {
      for (const v of adj.get(u) ?? []) {
        if (!seen.has(v)) {
          seen.add(v);
          next.push(v);
        }
      }
    }
    if (next.length === 0) break;
    layers.push(next);
    frontier = next;
  }
  return layers;
}

export function radialPositionsFromLayers(
  layers: string[][],
  opts: { cx: number; cy: number; radiusStep: number },
): Map<string, { x: number; y: number }> {
  const { cx, cy, radiusStep } = opts;
  const pos = new Map<string, { x: number; y: number }>();
  layers.forEach((layer, depth) => {
    const r = depth * radiusStep;
    if (depth === 0 && layer.length === 1) {
      pos.set(layer[0]!, { x: cx, y: cy });
      return;
    }
    const n = layer.length;
    layer.forEach((id, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      pos.set(id!, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    });
  });
  return pos;
}
