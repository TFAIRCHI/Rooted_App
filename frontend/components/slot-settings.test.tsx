import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SlotSettings } from "./slot-settings";
import type { Session } from "../lib/api";
import type { WorkspaceData } from "../lib/types";

const church = { id: "grace", slug: "grace", name: "Grace", timeZone: "America/Chicago", capabilities: ["series:manage"] };
const session: Session = { user: { id: "admin", displayName: "Admin" }, churches: [church], csrfToken: "csrf" };
const data: WorkspaceData = { church, series: [{ id: "week", title: "A week", weekAnchor: "2026-10-19", timeZone: "America/Chicago", sermonIds: [] }], members: [{ userId: "admin", displayName: "Admin", capabilities: ["series:manage"] }, { userId: "contributor", displayName: "Writer", capabilities: ["plans:edit"] }], slots: [], plans: [], content: [], notifications: [], sermons: [], integrations: {} };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("lets an administrator add another date with an eligible contributor and the church timezone", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "wednesday" }), { status: 201, headers: { "Content-Type": "application/json" } }));
  const refresh = vi.fn(async () => undefined);
  render(<SlotSettings data={data} seriesId="week" session={session} refresh={refresh} />);
  fireEvent.click(screen.getByRole("button", { name: "+ Add a study date" }));
  expect(screen.getByLabelText("Assigned contributor")).toHaveValue("");
  expect(screen.getByLabelText(/IANA timezone/)).toHaveValue("America/Chicago");
  expect(screen.getAllByRole("option").map(option => option.textContent)).not.toContain("Admin");
  fireEvent.change(screen.getByLabelText("Assigned contributor"), { target: { value: "contributor" } });
  fireEvent.change(screen.getByLabelText(/Study date/), { target: { value: "2026-10-21" } });
  fireEvent.click(screen.getByRole("button", { name: "Add study date" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ localDate: "2026-10-21", localTime: "08:00", timeZone: "America/Chicago", assigneeIds: ["contributor"] });
  expect(refresh).toHaveBeenCalledOnce();
});

it("uses the slot lifecycle version when moving and keeps published date controls read-only", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { headers: { "Content-Type": "application/json" } }));
  const slot = { id: "monday", seriesId: "week", planId: "plan", localDate: "2026-10-19", localTime: "08:00", timeZone: "America/Chicago", assigneeIds: ["contributor"], etag: '"slot:monday:4"' };
  const view = render(<SlotSettings slot={slot} data={data} seriesId="week" session={session} refresh={async () => undefined} />);
  fireEvent.click(screen.getByRole("button", { name: "Study date & assignment" }));
  fireEvent.change(screen.getByLabelText("Study date"), { target: { value: "2026-12-25" } });
  fireEvent.click(screen.getByRole("button", { name: "Save study settings" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ "If-Match": slot.etag });
  view.rerender(<SlotSettings slot={{ ...slot, everPublished: true }} data={data} seriesId="week" session={session} refresh={async () => undefined} />);
  fireEvent.click(screen.getByRole("button", { name: "Study date & assignment" }));
  expect(screen.getByLabelText("Study date")).toHaveAttribute("readonly");
  expect(screen.getByLabelText("Local release time")).toHaveAttribute("readonly");
});

it("preserves every assignee when a date changes without an assignment change", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { headers: { "Content-Type": "application/json" } }));
  const slot = { id: "multi", seriesId: "week", planId: "plan", localDate: "2031-01-06", localTime: "08:00", timeZone: "America/Chicago", assigneeIds: ["contributor", "another"], etag: '"slot:multi:1"' };
  render(<SlotSettings slot={slot} data={data} seriesId="week" session={session} refresh={async () => undefined} />);
  fireEvent.click(screen.getByRole("button", { name: "Study date & assignment" }));
  fireEvent.change(screen.getByLabelText("Study date"), { target: { value: "2031-01-07" } });
  fireEvent.click(screen.getByRole("button", { name: "Save study settings" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).assigneeIds).toEqual(["contributor", "another"]);
});

it("defaults a new study to the current contributor while allowing an explicit unassigned date", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { headers: { "Content-Type": "application/json" } }));
  const writer = { ...session, user: { id: "contributor", displayName: "Writer" } };
  render(<SlotSettings data={data} seriesId="week" session={writer} refresh={async () => undefined} />);
  fireEvent.click(screen.getByRole("button", { name: "+ Add a study date" }));
  expect(screen.getByLabelText("Assigned contributor")).toHaveValue("contributor");
  fireEvent.change(screen.getByLabelText("Assigned contributor"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Add study date" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).assigneeIds).toEqual([]);
});
