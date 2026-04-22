"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { JurisdictionOption } from "@/lib/queries/jurisdictions";
import { OFFICE_TYPE_OPTIONS } from "@/lib/queries/office-type-options";
import type { OfficialsUrlFilters } from "@/lib/queries/officials-url-filters";
import { cn } from "@/lib/utils";

const ALIGN_OPTIONS = [
  { value: "", label: "Any alignment" },
  { value: "GOP", label: "GOP" },
  { value: "neutral", label: "Neutral" },
  { value: "opposition", label: "Opposition" },
];

const PARTY_OPTIONS = [
  { value: "", label: "Any party" },
  { value: "Republican", label: "Republican" },
  { value: "Democratic", label: "Democratic" },
  { value: "Independent", label: "Independent" },
  { value: "Libertarian", label: "Libertarian" },
  { value: "Constitution", label: "Constitution" },
  { value: "Unaffiliated", label: "Unaffiliated" },
];

const CURRENT_OPTIONS = [
  { value: "1", label: "Current only" },
  { value: "0", label: "Former only" },
  { value: "all", label: "Current + former" },
];

function levelLabel(level: string): string {
  switch (level) {
    case "federal":
      return "Federal";
    case "state":
      return "State";
    case "county":
      return "County";
    case "city":
      return "City";
    case "district":
      return "District";
    default:
      return level;
  }
}

export type OfficialsFiltersProps = {
  jurisdictions: JurisdictionOption[];
  value: OfficialsUrlFilters;
  onChange: (next: OfficialsUrlFilters) => void;
  className?: string;
};

export function OfficialsFilters({ jurisdictions, value, onChange, className }: OfficialsFiltersProps) {
  const byLevel = React.useMemo(() => {
    const m = new Map<string, JurisdictionOption[]>();
    for (const j of jurisdictions) {
      const k = j.level;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(j);
    }
    return m;
  }, [jurisdictions]);

  return (
    <div
      className={cn(
        "space-y-5 rounded-[var(--radius-lg)] bg-surface-1 p-6 shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      <p className="font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--fg-4)]">
        Filters
      </p>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Jurisdiction</Label>
        <Select
          value={value.jurisdictionId ?? "__any__"}
          onValueChange={(v) =>
            onChange({ ...value, jurisdictionId: v === "__any__" ? null : v })
          }
        >
          <SelectTrigger className="w-full border-[rgba(0,15,34,0.12)] bg-surface">
            <SelectValue placeholder="Any jurisdiction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__any__">Any jurisdiction</SelectItem>
            {[...byLevel.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([lvl, group]) =>
                group.length ? (
                  <React.Fragment key={lvl}>
                    <div className="px-2 py-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--fg-4)]">
                      {levelLabel(lvl)}
                    </div>
                    {group.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.name}
                      </SelectItem>
                    ))}
                  </React.Fragment>
                ) : null,
              )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Office type</Label>
        <Select
          value={value.officeType ?? ""}
          onValueChange={(v) => onChange({ ...value, officeType: v || null })}
        >
          <SelectTrigger className="w-full border-[rgba(0,15,34,0.12)] bg-surface">
            <SelectValue placeholder="Any office" />
          </SelectTrigger>
          <SelectContent>
            {OFFICE_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value || "__any_office__"} value={o.value || "__any_office__"}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Party</Label>
        <Select
          value={value.party ?? "__any_party__"}
          onValueChange={(v) => onChange({ ...value, party: v === "__any_party__" ? null : v })}
        >
          <SelectTrigger className="w-full border-[rgba(0,15,34,0.12)] bg-surface">
            <SelectValue placeholder="Any party" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__any_party__">Any party</SelectItem>
            {PARTY_OPTIONS.filter((o) => o.value).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Alignment</Label>
        <Select
          value={value.subjectAlignment ?? "__any_align__"}
          onValueChange={(v) =>
            onChange({ ...value, subjectAlignment: v === "__any_align__" ? null : v })
          }
        >
          <SelectTrigger className="w-full border-[rgba(0,15,34,0.12)] bg-surface">
            <SelectValue placeholder="Any alignment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__any_align__">Any alignment</SelectItem>
            {ALIGN_OPTIONS.filter((o) => o.value).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">Tenure</Label>
        <Select
          value={
            value.isCurrent === null ? "all" : value.isCurrent === false ? "0" : "1"
          }
          onValueChange={(v) => {
            let isCurrent: boolean | null = true;
            if (v === "all") isCurrent = null;
            else if (v === "0") isCurrent = false;
            else isCurrent = true;
            onChange({ ...value, isCurrent });
          }}
        >
          <SelectTrigger className="w-full border-[rgba(0,15,34,0.12)] bg-surface">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="button"
        variant="ghost"
        className="w-full font-sans text-xs text-[var(--fg-3)]"
        onClick={() =>
          onChange({
            jurisdictionId: null,
            officeType: null,
            party: null,
            subjectAlignment: null,
            isCurrent: true,
          })
        }
      >
        Reset filters
      </Button>
    </div>
  );
}

export type OfficialsSaveViewBarProps = {
  viewName: string;
  onViewNameChange: (v: string) => void;
  onSave: () => void;
  disabled?: boolean;
};

export function OfficialsSaveViewBar({
  viewName,
  onViewNameChange,
  onSave,
  disabled,
}: OfficialsSaveViewBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1 space-y-2">
        <Label htmlFor="saved-view-name" className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-4)]">
          Save this view
        </Label>
        <Input
          id="saved-view-name"
          value={viewName}
          onChange={(e) => onViewNameChange(e.target.value)}
          placeholder="e.g. Utah supreme — GOP"
          className="border-[rgba(0,15,34,0.12)] bg-surface"
        />
      </div>
      <Button
        type="button"
        className="shrink-0"
        onClick={onSave}
        disabled={disabled || !viewName.trim()}
      >
        Save to Supabase
      </Button>
    </div>
  );
}
