"use client";

import { useUser } from "@clerk/nextjs";
import type { ReactNode } from "react";
import type { Role } from "@/lib/auth/roles";
import { roleAtLeast } from "@/lib/auth/roles";

type Props = {
  required: Role;
  children: ReactNode;
};

/** Belt-and-suspender UI gate — never the sole auth boundary. */
export function RoleGate({ required, children }: Props) {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return null;
  const raw = user?.publicMetadata?.role;
  const actual =
    raw === "admin" || raw === "operator" || raw === "viewer"
      ? raw
      : undefined;
  if (!roleAtLeast(actual, required)) return null;
  return <>{children}</>;
}
