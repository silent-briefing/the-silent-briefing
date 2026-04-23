import Link from "next/link";
import { Suspense } from "react";

import { AdminOpinionsList } from "@/components/admin/opinions/AdminOpinionsList";
import { OpinionUploadForm } from "@/components/admin/opinions/OpinionUploadForm";
import { buttonVariants } from "@/components/ui/button";

export default function AdminOpinionsPage() {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-sans text-sm uppercase tracking-[0.2em] text-[var(--fg-4)]">Admin</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-primary">Opinions</h1>
          <p className="mt-3 max-w-prose font-sans text-sm leading-relaxed text-[var(--fg-3)]">
            Upload Utah Supreme Court–style PDFs for chunking and RAG. Link ingested opinions to graph entities with
            accepted edges. Companion:{" "}
            <Link href="/admin/bills" className="text-primary underline-offset-4 hover:underline">
              Bills
            </Link>
            .
          </p>
        </div>
        <Link href="/admin/runs" className={buttonVariants({ variant: "outline" })}>
          Intel runs
        </Link>
      </div>
      <OpinionUploadForm className="mt-8" />
      <Suspense
        fallback={<p className="mt-10 font-sans text-sm text-[var(--fg-3)]">Loading table…</p>}
      >
        <AdminOpinionsList className="mt-10" />
      </Suspense>
    </div>
  );
}
