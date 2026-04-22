import * as React from "react";
import Link from "next/link";

import type { OfficialCardRow } from "@/lib/queries/schemas";
import { cn } from "@/lib/utils";

import { Card } from "../Card";
import { MetaLabel } from "../MetaLabel";
import { Portrait } from "../Portrait";
import { RetentionCountdown } from "./RetentionCountdown";

export type JusticeCardProps = {
  official: OfficialCardRow;
  /** Optional one-line teaser (e.g. latest published claim); omit when not loaded. */
  teaser?: string | null;
  className?: string;
};

export function JusticeCard({ official, teaser, className }: JusticeCardProps) {
  return (
    <Link href={`/judicial/${official.slug}`} className={cn("block h-full outline-none", className)}>
      <Card className="flex h-full flex-col gap-3 p-5">
        <div className="flex gap-4">
          <Portrait
            src={official.photo_url}
            alt=""
            name={official.full_name}
            size={56}
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="font-serif text-lg font-medium leading-snug text-[var(--fg-1)]">
              {official.full_name}
            </p>
            <RetentionCountdown retentionYear={official.retention_year} className="mt-1" />
            {official.subject_alignment ? (
              <MetaLabel className="mt-2 inline-block">{official.subject_alignment}</MetaLabel>
            ) : null}
          </div>
        </div>
        {teaser ? (
          <p className="line-clamp-2 font-sans text-sm leading-relaxed text-[var(--fg-3)]">{teaser}</p>
        ) : null}
      </Card>
    </Link>
  );
}
