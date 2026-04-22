import * as React from "react";

import { cn } from "@/lib/utils";

export type SectionHeaderProps = React.HTMLAttributes<HTMLHeadingElement>;

export function SectionHeader({ className, children, ...props }: SectionHeaderProps) {
  return (
    <h2
      className={cn(
        "font-serif text-xl font-semibold tracking-tight text-primary sm:text-2xl",
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  );
}
