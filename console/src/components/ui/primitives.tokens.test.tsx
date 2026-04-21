import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

describe("UI primitives (token-backed classes)", () => {
  it("Button default carries gold ring + offset on focus utilities", () => {
    render(<Button type="button">Go</Button>);
    const el = screen.getByRole("button", { name: /go/i });
    expect(el.className).toMatch(/ring-ring/);
    expect(el.className).toMatch(/ring-offset-4/);
  });

  it("Input carries ring + border-border family", () => {
    render(<Input placeholder="x" />);
    const el = screen.getByPlaceholderText("x");
    expect(el.className).toMatch(/border-input/);
    expect(el.className).toMatch(/ring-ring/);
  });

  it("Badge pill uses rounded-full", () => {
    render(<Badge>chip</Badge>);
    const el = screen.getByText("chip");
    expect(el.className).toMatch(/rounded-full/);
  });

  it("Table row uses tonal borders + muted hover", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>h</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>c</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const rows = screen.getAllByRole("row");
    const bodyRow = rows[rows.length - 1]!;
    expect(bodyRow.className).toMatch(/border-b/);
    expect(bodyRow.className).toMatch(/hover:bg-muted/);
  });

  it("Tabs list uses muted + border tokens", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">c</TabsContent>
      </Tabs>,
    );
    const list = screen.getByRole("tablist");
    expect(list.className).toMatch(/bg-muted/);
  });

  it("Checkbox uses primary fill when checked", () => {
    render(<Checkbox defaultChecked aria-label="c" />);
    const el = screen.getByRole("checkbox", { name: "c" });
    expect(el.className).toMatch(/data-checked:bg-primary/);
  });

  it("Switch uses primary when checked", () => {
    render(<Switch defaultChecked aria-label="s" />);
    const el = screen.getByRole("switch", { name: "s" });
    expect(el.className).toMatch(/data-checked:bg-primary/);
  });

  it("Select trigger uses ring-offset", () => {
    render(
      <Select>
        <SelectTrigger aria-label="pick">
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>,
    );
    const el = screen.getByRole("combobox", { name: "pick" });
    expect(el.className).toMatch(/ring-offset-4/);
  });

  it("Label is plain flex label", () => {
    render(<Label htmlFor="i">L</Label>);
    const el = screen.getByText("L");
    expect(el.tagName).toBe("LABEL");
    expect(el).toHaveAttribute("for", "i");
  });
});
