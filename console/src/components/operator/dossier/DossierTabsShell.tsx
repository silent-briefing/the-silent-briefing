"use client";

import {
  FileText,
  GitBranch,
  LayoutList,
  Newspaper,
  Scale,
  Swords,
} from "lucide-react";
import * as React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OfficialCardRow } from "@/lib/queries/schemas";
import { cn } from "@/lib/utils";

import { AdversarialPanel } from "./tabs/Adversarial";
import { ClaimsPanel } from "./tabs/Claims";
import { FeedPanel } from "./tabs/Feed";
import { GraphPanel } from "./tabs/Graph";
import { OverviewPanel } from "./tabs/Overview";
import { TimelinePanel } from "./tabs/Timeline";

const tabCls =
  "rounded-none border-0 bg-transparent px-0 py-3 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--fg-4)] data-active:text-[var(--fg-1)] after:bg-tertiary";

export type DossierTabsShellProps = {
  officialId: string;
  official: OfficialCardRow;
  jurisdictionName: string;
  className?: string;
};

export function DossierTabsShell({
  officialId,
  official,
  jurisdictionName,
  className,
}: DossierTabsShellProps) {
  const [tab, setTab] = React.useState("overview");

  const onTabChange = React.useCallback((v: string) => {
    const next = String(v);
    setTab(next);
    requestAnimationFrame(() => {
      document.getElementById(`dossier-panel-${next}`)?.focus();
    });
  }, []);

  return (
    <Tabs value={tab} onValueChange={onTabChange} className={cn("w-full", className)}>
      <TabsList
        variant="line"
        className="mb-8 h-auto w-full min-w-0 flex-wrap justify-start gap-x-6 gap-y-1 border-b border-[rgba(212,175,55,0.2)] bg-transparent p-0"
      >
        <TabsTrigger value="overview" className={cn(tabCls, "gap-2")}>
          <LayoutList className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
          Overview
        </TabsTrigger>
        <TabsTrigger value="claims" className={cn(tabCls, "gap-2")}>
          <FileText className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
          Claims
        </TabsTrigger>
        <TabsTrigger value="adversarial" className={cn(tabCls, "gap-2")}>
          <Swords className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
          Adversarial
        </TabsTrigger>
        <TabsTrigger value="graph" className={cn(tabCls, "gap-2")}>
          <GitBranch className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
          Graph
        </TabsTrigger>
        <TabsTrigger value="feed" className={cn(tabCls, "gap-2")}>
          <Newspaper className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
          Feed
        </TabsTrigger>
        <TabsTrigger value="timeline" className={cn(tabCls, "gap-2")}>
          <Scale className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
          Timeline
        </TabsTrigger>
      </TabsList>
      <TabsContent
        value="overview"
        id="dossier-panel-overview"
        tabIndex={-1}
        className="mt-0 max-w-5xl outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4"
      >
        <section aria-label="Dossier overview">
          <OverviewPanel official={official} jurisdictionName={jurisdictionName} />
        </section>
      </TabsContent>
      <TabsContent
        value="claims"
        id="dossier-panel-claims"
        tabIndex={-1}
        className="mt-0 max-w-5xl outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4"
      >
        <section aria-label="Dossier claims">
          <ClaimsPanel officialId={officialId} fetchEnabled={tab === "claims"} />
        </section>
      </TabsContent>
      <TabsContent
        value="adversarial"
        id="dossier-panel-adversarial"
        tabIndex={-1}
        className="mt-0 max-w-5xl outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4"
      >
        <section aria-label="Adversarial review">
          <AdversarialPanel officialId={officialId} fetchEnabled={tab === "adversarial"} />
        </section>
      </TabsContent>
      <TabsContent
        value="graph"
        id="dossier-panel-graph"
        tabIndex={-1}
        className="mt-0 max-w-5xl outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4"
      >
        <GraphPanel
          officialId={officialId}
          entityId={official.entity_id ?? null}
          fetchEnabled={tab === "graph"}
        />
      </TabsContent>
      <TabsContent
        value="feed"
        id="dossier-panel-feed"
        tabIndex={-1}
        className="mt-0 max-w-5xl outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4"
      >
        <section aria-label="News and feeds">
          <FeedPanel officialId={officialId} fetchEnabled={tab === "feed"} />
        </section>
      </TabsContent>
      <TabsContent
        value="timeline"
        id="dossier-panel-timeline"
        tabIndex={-1}
        className="mt-0 max-w-5xl outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4"
      >
        <section aria-label="Dossier timeline">
          <TimelinePanel officialId={officialId} fetchEnabled={tab === "timeline"} />
        </section>
      </TabsContent>
    </Tabs>
  );
}
