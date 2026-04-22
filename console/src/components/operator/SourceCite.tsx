import * as React from "react";
import { ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function formatFetchedAt(fetchedAt: Date | string): string {
  const d = typeof fetchedAt === "string" ? new Date(fetchedAt) : fetchedAt;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Denver",
  }).format(d);
}

export type SourceCiteProps = {
  url: string;
  fetchedAt: Date | string;
  className?: string;
};

export function SourceCite({ url, fetchedAt, className }: SourceCiteProps) {
  const host = React.useMemo(() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  }, [url]);

  return (
    <p
      className={cn(
        "flex min-w-0 items-center gap-1 font-sans text-sm text-muted-foreground",
        className,
      )}
    >
      <ChevronRightIcon className="size-4 shrink-0 text-tertiary" strokeWidth={1.5} aria-hidden />
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 truncate text-foreground underline-offset-4 hover:underline"
      >
        {host}
      </a>
      <span className="shrink-0 tabular-nums text-muted-foreground">· {formatFetchedAt(fetchedAt)}</span>
    </p>
  );
}
