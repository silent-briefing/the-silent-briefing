import * as React from "react";

import { cn } from "@/lib/utils";

export type EmptyStateProps = React.HTMLAttributes<HTMLParagraphElement>;

export function EmptyState({ className, children, ...props }: EmptyStateProps) {
  return (
    <p
      className={cn("font-serif text-base italic leading-relaxed text-muted-foreground", className)}
      {...props}
    >
      {children}
    </p>
  );
}
