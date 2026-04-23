"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { OfficialForm } from "@/components/admin/officials/OfficialForm";
import { BffHttpError, bffJson } from "@/lib/bff/client";
import type { JurisdictionOption } from "@/lib/queries/jurisdictions";
import {
  type OfficialCreateInput,
  type OfficialAdminRow,
  officialAdminRowSchema,
} from "@/lib/schemas/official";

function detailFromBffError(body: unknown): string {
  if (body && typeof body === "object" && "detail" in body) {
    const d = (body as { detail?: unknown }).detail;
    if (typeof d === "string") return d;
  }
  return "Request failed";
}

export function EditOfficialClient({
  jurisdictions,
  initial,
}: {
  jurisdictions: JurisdictionOption[];
  initial: OfficialAdminRow;
}) {
  const { getToken } = useAuth();
  const router = useRouter();

  return (
    <OfficialForm
      jurisdictions={jurisdictions}
      mode="edit"
      initial={initial}
      submitLabel="Save changes"
      onSubmit={async (values: OfficialCreateInput) => {
        try {
          await bffJson({
            path: `/v1/admin/officials/${initial.id}`,
            method: "PATCH",
            body: values,
            getToken: () => getToken(),
            schema: officialAdminRowSchema,
          });
          toast.success("Official updated");
          router.refresh();
        } catch (e) {
          if (e instanceof BffHttpError && e.status === 409) {
            toast.error(detailFromBffError(e.body));
            return;
          }
          toast.error(e instanceof Error ? e.message : "Update failed");
        }
      }}
    />
  );
}
