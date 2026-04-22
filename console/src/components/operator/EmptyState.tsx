import * as React from "react";

import { cn } from "@/lib/utils";

/** Block container — must not be `<p>` so callers can nest paragraphs, buttons, etc. */
export type EmptyStateProps = React.HTMLAttributes<HTMLDivElement>;

export function EmptyState({ className, children, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn("font-serif text-base italic leading-relaxed text-muted-foreground", className)}
      {...props}
    >
      {children}
    </div>
  );
}
