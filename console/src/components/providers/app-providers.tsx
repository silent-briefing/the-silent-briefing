"use client";

import { Toaster } from "@/components/ui/sonner";

/** Light-only shell: avoid `next-themes` here — its inline `<script>` trips React 19 in the App Router client tree. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
