import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card } from "./Card";
import { ClaimRow } from "./ClaimRow";
import { EmptyState } from "./EmptyState";
import { KpiTile } from "./KpiTile";
import { MetaLabel } from "./MetaLabel";
import { Portrait } from "./Portrait";
import { SectionHeader } from "./SectionHeader";
import { SourceCite } from "./SourceCite";
import { StatusDot } from "./StatusDot";

describe("operator primitives snapshots", () => {
  it("Card", () => {
    const { container } = render(<Card className="p-3">Child</Card>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("Card featured", () => {
    const { container } = render(
      <Card featured className="p-3">
        Featured
      </Card>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("SectionHeader", () => {
    const { container } = render(<SectionHeader>Justice Hagen dossier</SectionHeader>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("MetaLabel", () => {
    const { container } = render(<MetaLabel>Source</MetaLabel>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("Portrait initials", () => {
    const { container } = render(<Portrait name="Justice Hagen" alt="Hagen" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("SourceCite", () => {
    const { container } = render(
      <SourceCite url="https://vote.utah.gov/vote/menu.xhtml" fetchedAt="2026-04-21T20:00:00.000Z" />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("StatusDot", () => {
    const { container } = render(<StatusDot status="pending" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("ClaimRow", () => {
    const { container } = render(
      <ClaimRow status="flagged" adversarial>
        Claim text for HD 32.
      </ClaimRow>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("KpiTile", () => {
    const { container } = render(<KpiTile value="42" label="Open items" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("EmptyState", () => {
    const { container } = render(<EmptyState>No rows for this filter.</EmptyState>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
