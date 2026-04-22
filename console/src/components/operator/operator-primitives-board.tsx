"use client";

import * as React from "react";

import {
  Card,
  ClaimRow,
  EmptyState,
  KpiTile,
  MetaLabel,
  Portrait,
  SectionHeader,
  SourceCite,
} from "@/components/operator";

export function OperatorPrimitivesBoard() {
  const sampleFetched = "2026-04-21T14:30:00.000Z";

  return (
    <div className="mx-auto max-w-3xl space-y-12 text-foreground">
      <header className="space-y-2">
        <SectionHeader>Operator primitives</SectionHeader>
        <p className="font-sans text-sm text-muted-foreground">
          Dev-only board — Utah-shaped copy for Phase B.2. Justice Hagen, HD 32, vote.utah.gov.
        </p>
      </header>

      <section className="space-y-4">
        <MetaLabel>Card</MetaLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-4">
            <p className="font-serif text-lg">Retention outlook — Justice Hagen</p>
            <p className="mt-2 font-sans text-sm text-muted-foreground">
              Next vote cycle referenced from vote.utah.gov filings.
            </p>
          </Card>
          <Card featured className="p-4">
            <p className="font-serif text-lg">Featured — HD 32 brief</p>
            <p className="mt-2 font-sans text-sm text-muted-foreground">Gold top border + hover pinstripe.</p>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <MetaLabel>Kpi + portrait</MetaLabel>
        <div className="flex flex-wrap items-end gap-8">
          <KpiTile value="128" label="Open claims" />
          <KpiTile value="12" label="Intel runs (7d)" />
          <Portrait name="Justice Hagen" alt="Justice Hagen" size={56} />
        </div>
      </section>

      <section className="space-y-4">
        <MetaLabel>Source + claim rows</MetaLabel>
        <Card className="p-4">
          <SourceCite url="https://vote.utah.gov/vote/menu.xhtml" fetchedAt={sampleFetched} />
          <ClaimRow
            status="vetted"
            className="border-t border-border/60"
            source={
              <SourceCite url="https://utcourts.gov/opinions" fetchedAt={sampleFetched} />
            }
          >
            Utah Supreme Court alignment on retention messaging — vetted line for Justice Hagen.
          </ClaimRow>
          <ClaimRow status="pending" adversarial className="border-t border-border/60">
            Pending claim with adversarial flag (stub).
          </ClaimRow>
        </Card>
      </section>

      <section className="space-y-2">
        <MetaLabel>Empty state</MetaLabel>
        <EmptyState>No officials matched HD 32 filters yet — widen jurisdiction or clear party filter.</EmptyState>
      </section>
    </div>
  );
}
