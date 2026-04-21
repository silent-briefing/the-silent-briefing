"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  CheckIcon,
  ChevronDownIcon,
  MoreHorizontalIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";

const formSchema = z.object({
  label: z.string().min(2, "At least two characters."),
});

export function PrimitivesBoard() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { label: "" },
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 pb-24">
      <header className="space-y-2">
        <p className="text-xs font-medium tracking-[0.2em] text-[var(--fg-4)] uppercase">
          Dev only
        </p>
        <h1 className="font-serif text-3xl text-[var(--fg-1)]">
          UI primitives storyboard
        </h1>
        <p className="text-sm text-[var(--fg-3)]">
          Token-backed shadcn components for axe + visual checks. Not shipped in
          production.
        </p>
      </header>

      <section className="space-y-3 rounded-[var(--radius-lg)] bg-surface-1 p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-xs font-medium tracking-[0.2em] text-[var(--fg-4)] uppercase">
          Button
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button">Primary</Button>
          <Button type="button" variant="secondary">
            Secondary
          </Button>
          <Button type="button" variant="outline">
            Outline
          </Button>
          <Button type="button" variant="ghost">
            Ghost
          </Button>
          <Button type="button" variant="destructive">
            Destructive
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-[var(--radius-lg)] bg-surface-1 p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-xs font-medium tracking-[0.2em] text-[var(--fg-4)] uppercase">
          Badge
        </h2>
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Flagged</Badge>
        </div>
      </section>

      <section className="space-y-3 rounded-[var(--radius-lg)] bg-surface-1 p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-xs font-medium tracking-[0.2em] text-[var(--fg-4)] uppercase">
          Input & label
        </h2>
        <div className="grid max-w-md gap-2">
          <Label htmlFor="demo-input">Label</Label>
          <Input id="demo-input" placeholder="Placeholder" />
        </div>
      </section>

      <section className="space-y-3 rounded-[var(--radius-lg)] bg-surface-1 p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-xs font-medium tracking-[0.2em] text-[var(--fg-4)] uppercase">
          Select
        </h2>
        <Select defaultValue="one">
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Pick one" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="one">One</SelectItem>
            <SelectItem value="two">Two</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <section className="space-y-3 rounded-[var(--radius-lg)] bg-surface-1 p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-xs font-medium tracking-[0.2em] text-[var(--fg-4)] uppercase">
          Dialog
        </h2>
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>
            Open dialog
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Example</DialogTitle>
              <DialogDescription>
                Dialog surfaces use tonal popover tokens.
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Content area.</p>
          </DialogContent>
        </Dialog>
      </section>

      <section className="space-y-3 rounded-[var(--radius-lg)] bg-surface-1 p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-xs font-medium tracking-[0.2em] text-[var(--fg-4)] uppercase">
          Dropdown menu
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            Menu <ChevronDownIcon className="size-4 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Action</DropdownMenuItem>
            <DropdownMenuItem>Another</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>

      <section className="space-y-3 rounded-[var(--radius-lg)] bg-surface-1 p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-xs font-medium tracking-[0.2em] text-[var(--fg-4)] uppercase">
          Table
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Alpha</TableCell>
              <TableCell>Vetted</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Beta</TableCell>
              <TableCell>Pending</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      <section className="space-y-3 rounded-[var(--radius-lg)] bg-surface-1 p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-xs font-medium tracking-[0.2em] text-[var(--fg-4)] uppercase">
          Form (react-hook-form + zod)
        </h2>
        <Form {...form}>
          <form
            className="grid max-w-md gap-4"
            onSubmit={form.handleSubmit(() => undefined)}
          >
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Required" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Submit</Button>
          </form>
        </Form>
      </section>

      <section className="space-y-3 rounded-[var(--radius-lg)] bg-surface-1 p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-xs font-medium tracking-[0.2em] text-[var(--fg-4)] uppercase">
          Toast (sonner)
        </h2>
        <Button
          type="button"
          variant="outline"
          onClick={() => toast.success("Saved")}
        >
          Fire toast
        </Button>
      </section>

      <section className="space-y-3 rounded-[var(--radius-lg)] bg-surface-1 p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-xs font-medium tracking-[0.2em] text-[var(--fg-4)] uppercase">
          Tabs
        </h2>
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">Tab A</TabsTrigger>
            <TabsTrigger value="b">Tab B</TabsTrigger>
          </TabsList>
          <TabsContent value="a">Panel A</TabsContent>
          <TabsContent value="b">Panel B</TabsContent>
        </Tabs>
      </section>

      <section className="space-y-3 rounded-[var(--radius-lg)] bg-surface-1 p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-xs font-medium tracking-[0.2em] text-[var(--fg-4)] uppercase">
          Checkbox & switch
        </h2>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Checkbox id="c1" defaultChecked />
            <Label htmlFor="c1">Checked</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="s1" defaultChecked />
            <Label htmlFor="s1">On</Label>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-[var(--radius-lg)] bg-surface-1 p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-xs font-medium tracking-[0.2em] text-[var(--fg-4)] uppercase">
          Popover
        </h2>
        <Popover>
          <PopoverTrigger render={<Button variant="outline" />}>
            Open popover
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <p className="text-sm">Popover content uses tonal surfaces.</p>
          </PopoverContent>
        </Popover>
      </section>

      <section className="space-y-3 rounded-[var(--radius-lg)] bg-surface-1 p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-xs font-medium tracking-[0.2em] text-[var(--fg-4)] uppercase">
          Command
        </h2>
        <Command className="border border-border shadow-[var(--shadow-sm)]">
          <CommandInput placeholder="Search…" />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup heading="Items">
              <CommandItem>
                <CheckIcon className="size-4" /> First
              </CommandItem>
              <CommandItem>
                <MoreHorizontalIcon className="size-4" /> Second
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </section>
    </div>
  );
}
