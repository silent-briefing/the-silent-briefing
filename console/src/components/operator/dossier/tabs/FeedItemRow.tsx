import { MetaLabel } from "@/components/operator/MetaLabel";
import type { OfficialFeedsResponse } from "@/lib/queries/schemas";

import { cn } from "@/lib/utils";

type Item = OfficialFeedsResponse["items"][number];

export type FeedItemRowProps = {
  item: Item;
  className?: string;
};

function formatWhen(iso: string | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function FeedItemRow({ item, className }: FeedItemRowProps) {
  const when = formatWhen(item.published_at);
  const title = item.headline?.trim() || item.url;

  return (
    <div className={cn("rounded-[var(--radius-md)] bg-surface-1/50 px-4 py-3 shadow-[var(--shadow-sm)]", className)}>
      <MetaLabel className="mb-1 block text-foreground">{item.source}</MetaLabel>
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="font-sans text-[15px] font-medium leading-snug text-foreground underline-offset-4 hover:underline"
      >
        {title}
      </a>
      {when ? (
        <p className="mt-1 font-sans text-xs tabular-nums text-muted-foreground">{when}</p>
      ) : null}
    </div>
  );
}
