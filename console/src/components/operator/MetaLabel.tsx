import * as React from "react";

import { cn } from "@/lib/utils";

export type MetaLabelProps = React.HTMLAttributes<HTMLSpanElement>;

/** Inter 12px / UPPERCASE / 0.2em tracking — dossier metadata rail. */
export function MetaLabel({ className, children, ...props }: MetaLabelProps) {
  return (
    <span
      className={cn(
        "font-sans text-[12px] font-bold uppercase tracking-[0.2em] text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
