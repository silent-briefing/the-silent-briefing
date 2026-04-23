"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import * as React from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";

import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { JurisdictionOption } from "@/lib/queries/jurisdictions";
import { OFFICE_TYPE_OPTIONS } from "@/lib/queries/office-type-options";
import {
  JUDGE_OFFICE_TYPES,
  type OfficialAdminRow,
  type OfficialCreateInput,
  officialCreateSchema,
  slugFromFullName,
  subjectAlignmentSchema,
} from "@/lib/schemas/official";
import { cn } from "@/lib/utils";

const ALIGN_NONE = "__none__";
const ALIGN_OPTIONS: { value: string; label: string }[] = [
  { value: ALIGN_NONE, label: "—" },
  { value: "gop", label: "GOP" },
  { value: "opposition", label: "Opposition" },
  { value: "neutral", label: "Neutral" },
  { value: "nonpartisan", label: "Nonpartisan" },
];

function rowToFormValues(row: OfficialAdminRow): OfficialCreateInput {
  const align = row.subject_alignment;
  const parsedAlign = align && subjectAlignmentSchema.safeParse(align).success ? align : null;
  const dateOnly = (s: string | null | undefined) =>
    s && s.length >= 10 ? s.slice(0, 10) : null;
  return {
    full_name: row.full_name,
    slug: row.slug,
    jurisdiction_id: row.jurisdiction_id,
    office_type: row.office_type as OfficialCreateInput["office_type"],
    party: row.party ?? null,
    subject_alignment: parsedAlign as OfficialCreateInput["subject_alignment"],
    term_start: dateOnly(row.term_start),
    term_end: dateOnly(row.term_end),
    retention_year: row.retention_year ?? null,
    is_current: row.is_current,
    photo_url: row.photo_url ?? null,
    bio_summary: row.bio_summary ?? null,
  };
}

export type OfficialFormProps = {
  jurisdictions: JurisdictionOption[];
  mode: "create" | "edit";
  initial?: OfficialAdminRow;
  submitLabel: string;
  onSubmit: (values: OfficialCreateInput) => Promise<void>;
  className?: string;
};

export function OfficialForm({
  jurisdictions,
  mode,
  initial,
  submitLabel,
  onSubmit,
  className,
}: OfficialFormProps) {
  const defaults = React.useMemo<OfficialCreateInput>(
    () =>
      initial
        ? rowToFormValues(initial)
        : {
            full_name: "",
            slug: "",
            jurisdiction_id: jurisdictions[0]?.id ?? "",
            office_type: "state_supreme_justice",
            party: null,
            subject_alignment: null,
            term_start: null,
            term_end: null,
            retention_year: null,
            is_current: true,
            photo_url: null,
            bio_summary: null,
          },
    [initial, jurisdictions],
  );

  const form = useForm<OfficialCreateInput>({
    resolver: zodResolver(officialCreateSchema) as Resolver<OfficialCreateInput>,
    defaultValues: defaults,
  });

  React.useEffect(() => {
    if (mode === "edit" && initial) form.reset(rowToFormValues(initial));
  }, [form, mode, initial]);

  const officeType = form.watch("office_type");
  const fullName = form.watch("full_name");
  const slugTouched = React.useRef(mode === "edit");

  React.useEffect(() => {
    if (mode !== "create" || slugTouched.current) return;
    const next = slugFromFullName(fullName);
    if (next) form.setValue("slug", next);
  }, [fullName, form, mode]);

  const showParty = !JUDGE_OFFICE_TYPES.has(officeType);

  const byLevel = React.useMemo(() => {
    const m = new Map<string, JurisdictionOption[]>();
    for (const j of jurisdictions) {
      if (!m.has(j.level)) m.set(j.level, []);
      m.get(j.level)!.push(j);
    }
    return m;
  }, [jurisdictions]);

  return (
    <form
      className={cn("max-w-2xl space-y-6", className)}
      onSubmit={form.handleSubmit(async (v) => {
        await onSubmit({
          ...v,
          party: showParty ? (v.party === "" ? null : v.party) : null,
          photo_url: v.photo_url === "" ? null : v.photo_url,
          bio_summary: v.bio_summary === "" ? null : v.bio_summary,
        });
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            aria-invalid={!!form.formState.errors.full_name}
            {...form.register("full_name", {
              onChange: () => {
                if (mode === "create") slugTouched.current = false;
              },
            })}
          />
          {form.formState.errors.full_name ? (
            <p className="text-sm text-destructive">{form.formState.errors.full_name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            aria-invalid={!!form.formState.errors.slug}
            {...form.register("slug", {
              onChange: () => {
                slugTouched.current = true;
              },
            })}
          />
          {form.formState.errors.slug ? (
            <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Jurisdiction</Label>
          <Controller
            control={form.control}
            name="jurisdiction_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full border-[rgba(0,15,34,0.12)] bg-surface">
                  <SelectValue placeholder="Select jurisdiction" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(byLevel.entries()).map(([level, opts]) => (
                    <React.Fragment key={level}>
                      {opts.map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.name} ({j.slug})
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.jurisdiction_id ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.jurisdiction_id.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>Office type</Label>
          <Controller
            control={form.control}
            name="office_type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full border-[rgba(0,15,34,0.12)] bg-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OFFICE_TYPE_OPTIONS.filter((o) => o.value !== "").map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        {showParty ? (
          <div className="space-y-2">
            <Label htmlFor="party">Party</Label>
            <Input id="party" {...form.register("party")} placeholder="e.g. Republican" />
            {form.formState.errors.party ? (
              <p className="text-sm text-destructive">{form.formState.errors.party.message}</p>
            ) : null}
          </div>
        ) : (
          <p className="font-sans text-sm text-[var(--fg-3)] sm:col-span-2">
            Party is hidden for judicial offices (nonpartisan).
          </p>
        )}
        <div className="space-y-2">
          <Label>Subject alignment</Label>
          <Controller
            control={form.control}
            name="subject_alignment"
            render={({ field }) => (
              <Select
                value={field.value ?? ALIGN_NONE}
                onValueChange={(v) => field.onChange(v === ALIGN_NONE ? null : v)}
              >
                <SelectTrigger className="w-full border-[rgba(0,15,34,0.12)] bg-surface">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {ALIGN_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="retention_year">Retention year</Label>
          <Input
            id="retention_year"
            type="number"
            {...form.register("retention_year", {
              setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
            })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="term_start">Term start (ISO date)</Label>
          <Input id="term_start" type="date" {...form.register("term_start")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="term_end">Term end (ISO date)</Label>
          <Input id="term_end" type="date" {...form.register("term_end")} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="photo_url">Photo URL</Label>
          <Input id="photo_url" {...form.register("photo_url")} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="bio_summary">Bio summary</Label>
          <Textarea id="bio_summary" rows={4} {...form.register("bio_summary")} />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <Controller
            control={form.control}
            name="is_current"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={(c) => field.onChange(c === true)}
                id="is_current"
              />
            )}
          />
          <Label htmlFor="is_current" className="font-normal">
            Currently holds office
          </Label>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : submitLabel}
        </Button>
        <Link href="/admin/officials" className={cn(buttonVariants({ variant: "outline" }))}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
