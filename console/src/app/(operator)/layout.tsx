import { OperatorShell } from "@/components/chrome/operator-shell";

export const dynamic = "force-dynamic";

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OperatorShell>{children}</OperatorShell>;
}
