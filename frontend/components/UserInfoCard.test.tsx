/**
 * Tests for UserInfoCard component
 *
 * Testing image rendering with Next.js Image component
 */

import { render, screen } from "@testing-library/react";
import UserInfoCard from "./UserInfoCard";

describe("UserInfoCard", () => {
  it("renders user with Google profile image using Next.js Image", () => {
    const user = {
      email: "test@example.com",
      nickname: "TestUser",
      image: "https://lh3.googleusercontent.com/a/test-image",
      role: "admin",
    };

    render(<UserInfoCard user={user} />);

    // Next.js Image component should render
    const image = screen.getByAltText("TestUser");
    expect(image).toBeInTheDocument();
    expect(image.tagName).toBe("IMG");
  });

  it("renders fallback initial when no image provided", () => {
    const user = {
      email: "test@example.com",
      nickname: "TestUser",
      image: null,
      role: "member",
    };

    render(<UserInfoCard user={user} />);

    // Should show first letter of nickname
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("uses email username when nickname is not provided", () => {
    const user = {
      email: "john.doe@example.com",
      nickname: null,
      image: null,
      role: "owner",
    };

    render(<UserInfoCard user={user} />);

    // Should show email username
    expect(screen.getByText("john.doe")).toBeInTheDocument();
    expect(screen.getByText("J")).toBeInTheDocument(); // Initial
  });

  it("handles external image URLs correctly", () => {
    const user = {
      email: "external@example.com",
      nickname: "External",
      image: "https://example.com/avatar.jpg",
      role: "member",
    };

    render(<UserInfoCard user={user} />);

    const image = screen.getByAltText("External");
    expect(image).toBeInTheDocument();
  });
});
