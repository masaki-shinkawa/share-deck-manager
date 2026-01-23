/**
 * Tests for DashboardCard component
 */

import { render, screen } from "@testing-library/react";
import DashboardCard from "./DashboardCard";

describe("DashboardCard", () => {
  it("renders card with title and description", () => {
    render(
      <DashboardCard
        title="My Decks"
        description="Manage your deck collection"
        href="/decks"
        icon="arrow"
      />
    );

    expect(screen.getByText("My Decks")).toBeInTheDocument();
    expect(screen.getByText("Manage your deck collection")).toBeInTheDocument();
  });

  it("renders with arrow icon when not disabled", () => {
    const { container } = render(
      <DashboardCard
        title="My Decks"
        description="Manage your deck collection"
        href="/decks"
        icon="arrow"
      />
    );

    // Arrow icon should be present
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders with lock icon when disabled", () => {
    render(
      <DashboardCard
        title="Coming Soon"
        description="More features in development"
        icon="lock"
        disabled
      />
    );

    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
  });

  it("applies disabled styles when disabled prop is true", () => {
    const { container } = render(
      <DashboardCard
        title="Coming Soon"
        description="More features"
        icon="lock"
        disabled
      />
    );

    const card = container.firstChild;
    expect(card).toHaveClass("opacity-60");
    expect(card).toHaveClass("cursor-not-allowed");
  });

  it("applies hover styles when not disabled", () => {
    const { container } = render(
      <DashboardCard
        title="My Decks"
        description="Manage decks"
        href="/decks"
        icon="arrow"
      />
    );

    const card = container.firstChild;
    expect(card).not.toHaveClass("cursor-not-allowed");
  });

  it("wraps in Link when href is provided and not disabled", () => {
    render(
      <DashboardCard
        title="My Decks"
        description="Manage decks"
        href="/decks"
        icon="arrow"
      />
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/decks");
  });

  it("does not wrap in Link when disabled", () => {
    const { container } = render(
      <DashboardCard
        title="Coming Soon"
        description="More features"
        icon="lock"
        disabled
      />
    );

    const links = container.querySelectorAll("a");
    expect(links.length).toBe(0);
  });

  it("does not wrap in Link when href is missing", () => {
    const { container } = render(
      <DashboardCard
        title="Test"
        description="Test description"
        icon="lock"
      />
    );

    const links = container.querySelectorAll("a");
    expect(links.length).toBe(0);
  });
});
