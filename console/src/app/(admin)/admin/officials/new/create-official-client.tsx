"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { OfficialForm } from "@/components/admin/officials/OfficialForm";
import { BffHttpError, bffJson } from "@/lib/bff/client";
import type { JurisdictionOption } from "@/lib/queries/jurisdictions";
import {
  type OfficialCreateInput,
  officialAdminRowSchema,
} from "@/lib/schemas/official";

function detailFromBffError(body: unknown): string {
  if (body && typeof body === "object" && "detail" in body) {
    const d = (body as { detail?: unknown }).detail;
    if (typeof d === "string") return d;
  }
  return "Request failed";
}

export function CreateOfficialClient({ jurisdictions }: { jurisdictions: JurisdictionOption[] }) {
  const { getToken } = useAuth();
  const router = useRouter();

  return (
    <OfficialForm
      jurisdictions={jurisdictions}
      mode="create"
      submitLabel="Create official"
      onSubmit={async (values: OfficialCreateInput) => {
        try {
          const row = await bffJson({
            path: "/v1/admin/officials",
            method: "POST",
            body: values,
            getToken: () => getToken(),
            schema: officialAdminRowSchema,
          });
          toast.success("Official created");
          router.push(`/admin/officials/${row.id}`);
        } catch (e) {
          if (e instanceof BffHttpError && e.status === 409) {
            toast.error(detailFromBffError(e.body));
            return;
          }
          toast.error(e instanceof Error ? e.message : "Create failed");
        }
      }}
    />
  );
}
