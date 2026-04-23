import type { OfficialsUrlFilters } from "@/lib/queries/officials-url-filters";
import { officialsFiltersToSearchParams } from "@/lib/queries/officials-url-filters";

/** Build `/v1/admin/officials` query string — filters align with operator hub URL params plus pagination. */
export function adminOfficialsListPath(
  filters: OfficialsUrlFilters,
  opts: { page: number; pageSize: number; q?: string },
): string {
  const sp = officialsFiltersToSearchParams(filters);
  const page = Math.max(0, opts.page);
  const pageSize = Math.min(200, Math.max(1, opts.pageSize));
  sp.set("offset", String(page * pageSize));
  sp.set("limit", String(pageSize));
  const qq = opts.q?.trim();
  if (qq) sp.set("q", qq);
  return `/v1/admin/officials?${sp.toString()}`;
}
