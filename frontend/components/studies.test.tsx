import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CalendarBoard, Studies, studyState } from "./studies";
import type { Slot, WorkspaceData } from "../lib/types";
import type { Session } from "../lib/api";

const church = { id: "church", slug: "grace", name: "Grace", timeZone: "America/New_York", capabilities: ["series:manage"] };
const session: Session = { user: { id: "admin", displayName: "Admin" }, churches: [church], csrfToken: "csrf" };
const first: Slot = { id: "one", planId: "plan-one", seriesId: "old", localDate: "2026-10-21", localTime: "08:00", timeZone: church.timeZone, assigneeIds: [], etag: '"slot:one:2"' };
const second: Slot = { ...first, id: "two", planId: "plan-two", seriesId: "new", localDate: "2026-10-23" };
const data: WorkspaceData = { church, series: [{ id: "old", title: "September", weekAnchor: "2026-09-01", timeZone: church.timeZone, sermonIds: [] }, { id: "new", title: "October", weekAnchor: "2026-10-01", timeZone: church.timeZone, sermonIds: [] }], slots: [first, second], plans: [], content: [], members: [], sermons: [], integrations: {}, notifications: [] };
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); window.history.replaceState(null, "", "/"); });

it("shows moved dates from every series by actual date and opens the church-local current week", () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-22T02:00:00Z"));
  render(<Studies data={data} session={session} refresh={async () => undefined} route="studies" />);
  expect(screen.getByRole("button", { name: /Week 4 · Oct 18–Oct 24/ })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByTestId("date-card-one")).toBeInTheDocument();
  expect(screen.getByTestId("date-card-two")).toBeInTheDocument();
  expect(screen.getByLabelText("Study month")).toHaveValue("2026-10");
});
it("resolves an older series/slot deep link using the moved slot's current date", async () => {
  window.history.replaceState(null, "", "/studies?series=old&slot=one&month=2026-09");
  render(<Studies data={data} session={session} refresh={async () => undefined} route="studies" />);
  await waitFor(() => expect(screen.getByLabelText("Study month")).toHaveValue("2026-10"));
  expect(screen.getByTestId("date-card-one")).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Next month" }));
  expect(screen.getByLabelText("Study month")).toHaveValue("2026-11");
  expect(new URLSearchParams(window.location.search).has("slot")).toBe(false);
});
it("drags the explicit slot ID onto the target civil date and locks every ever-published date", () => {
  const requestMove = vi.fn(); const setData = vi.fn();
  const transfer = { setData, getData: vi.fn(() => second.id), effectAllowed: "", dropEffect: "" };
  const view = render(<CalendarBoard data={data} slots={[first, second]} month="2026-10" selectSlot={vi.fn()} canMove requestMove={requestMove} />);
  fireEvent.dragStart(view.container.querySelector('[data-slot-id="two"]')!, { dataTransfer: transfer });
  expect(setData).toHaveBeenCalledWith("text/plain", "two");
  fireEvent.drop(view.container.querySelector('[data-date="2026-10-29"]')!, { dataTransfer: transfer });
  expect(requestMove).toHaveBeenCalledWith(second, "2026-10-29");
  view.rerender(<CalendarBoard data={data} slots={[{ ...first, everPublished: true }]} month="2026-10" selectSlot={vi.fn()} canMove requestMove={requestMove} />);
  expect(view.container.querySelector('[data-slot-id="one"]')).toHaveAttribute("draggable", "false");
});
it("does not call an approved optional plan an approved study", () => {
  const approvedPlan = { id: first.planId, kind: "plan", slotId: first.id, planId: null, status: "approved", version: 1, etag: '"1"', headRevisionId: null, head: null, approvalId: null };
  expect(studyState({ ...data, plans: [approvedPlan] }, first)).toBe("not started");
});

it("preserves an open noncurrent week and its typed date form across workspace revalidation", () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-22T02:00:00Z"));
  const view = render(<Studies data={data} session={session} refresh={async () => undefined} route="studies" />);
  fireEvent.click(screen.getByRole("button", { name: /Week 3 · Oct 11–Oct 17/ }));
  fireEvent.click(screen.getByRole("button", { name: "+ Add a study date" }));
  fireEvent.change(screen.getByLabelText("Study date"), { target: { value: "2026-10-12" } });
  fireEvent.change(screen.getByLabelText("Local release time"), { target: { value: "09:45" } });
  view.rerender(<Studies data={{ ...data, slots: data.slots.map(slot => ({ ...slot })) }} session={session} refresh={async () => undefined} route="studies" />);
  expect(screen.getByRole("button", { name: /Week 3 · Oct 11–Oct 17/ })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByLabelText("Study date")).toHaveValue("2026-10-12");
  expect(screen.getByLabelText("Local release time")).toHaveValue("09:45");
});
