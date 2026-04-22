import * as React from "react";

import { cn } from "@/lib/utils";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** 2px gold top border (featured dossier / hero card). */
  featured?: boolean;
};

export function Card({ className, featured, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-lg bg-card text-card-foreground",
        "shadow-sm transition-shadow duration-200 hover:shadow-md",
        "border-l-2 border-l-transparent pl-3 transition-[border-color] duration-200 hover:border-l-tertiary",
        featured && "border-t-2 border-t-tertiary pt-3",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
