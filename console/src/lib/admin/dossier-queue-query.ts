/** Build `/v1/admin/dossiers/queue` query string. */
export function dossierQueuePath(opts: {
  page: number;
  pageSize: number;
  needsReview: boolean;
  category?: string;
  maxGroundedness?: number;
}): string {
  const p = new URLSearchParams();
  const pageSize = Math.min(200, Math.max(1, opts.pageSize));
  const page = Math.max(0, opts.page);
  p.set("offset", String(page * pageSize));
  p.set("limit", String(pageSize));
  p.set("needs_review", opts.needsReview ? "true" : "false");
  const c = opts.category?.trim();
  if (c) p.set("category", c);
  if (opts.maxGroundedness != null && !Number.isNaN(opts.maxGroundedness)) {
    p.set("max_groundedness", String(opts.maxGroundedness));
  }
  return `/v1/admin/dossiers/queue?${p.toString()}`;
}
