import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ChurchBrand, sidebarLogo } from "./church-brand";

afterEach(cleanup);
const theme = { mode: "light" as const, primary: "#177569", accent: "#ae813e", surface: "#ffffff", logoUrl: "/logo/one/lockup" };
it("uses the original aspect metadata to select a square mark", () => {
  expect(sidebarLogo({ ...theme, logoWidth: 400, logoHeight: 400 })).toBe("/logo/one/mark");
  expect(sidebarLogo({ ...theme, logoWidth: 1200, logoHeight: 300 })).toBe(theme.logoUrl);
});
it("replaces, removes, and recovers failed church logos through React", () => {
  const view = render(<ChurchBrand name="Grace Church" theme={theme} />);
  expect(screen.getByRole("link", { name: "Grace Church · Rooted home" })).toBeInTheDocument();
  expect(view.container.querySelector("img")).toHaveAttribute("src", theme.logoUrl);
  fireEvent.error(view.container.querySelector("img")!);
  expect(view.container.querySelector("img")).toBeNull();
  view.rerender(<ChurchBrand name="River Church" theme={{ ...theme, logoUrl: "/logo/two/lockup" }} />);
  expect(view.container.querySelector("img")).toHaveAttribute("src", "/logo/two/lockup");
  expect(screen.queryByText("Grace Church")).not.toBeInTheDocument();
  view.rerender(<ChurchBrand name="River Church" theme={{ ...theme, logoUrl: null }} />);
  expect(view.container.querySelector("img")).toBeNull();
  expect(screen.getByText("Rooted")).toBeInTheDocument();
});
