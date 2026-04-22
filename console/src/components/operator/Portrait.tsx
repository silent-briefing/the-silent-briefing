import * as React from "react";

import { cn } from "@/lib/utils";

export type PortraitProps = {
  src?: string | null;
  alt: string;
  /** Used for serif initials when `src` is missing. */
  name: string;
  size?: number;
  className?: string;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Grayscale at rest, color on hover (600ms). `rounded-full` allowed for avatars. */
export function Portrait({ src, alt, name, size = 48, className }: PortraitProps) {
  const dim = { width: size, height: size };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small operator primitive; avoids optimizer config for arbitrary URLs.
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={cn(
          "rounded-full object-cover grayscale transition-[filter] duration-[600ms] ease-in-out hover:grayscale-0",
          className,
        )}
        style={dim}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        "flex items-center justify-center rounded-full bg-muted font-serif text-lg font-semibold text-muted-foreground",
        className,
      )}
      style={dim}
    >
      <span aria-hidden>{initialsFromName(name)}</span>
    </div>
  );
}
