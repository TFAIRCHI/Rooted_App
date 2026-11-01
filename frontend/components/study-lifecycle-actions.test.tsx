import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StudyLifecycleActions } from "./study-lifecycle-actions";
import type { Slot, WorkspaceData } from "../lib/types";
import type { Session } from "../lib/api";

const church = { id: "church", slug: "church", name: "Grace", capabilities: ["studies:delete", "admin:manage"] };
const session: Session = { user: { id: "admin", displayName: "Admin" }, churches: [church], csrfToken: "csrf" };
const slot: Slot = { id: "study", seriesId: "series", planId: "plan", localDate: "2026-10-21", localTime: "08:00", timeZone: "America/New_York", assigneeIds: [], etag: '"slot:study:3"' };
const data: WorkspaceData = { church, slots: [slot], members: [], series: [], plans: [], content: [], sermons: [], notifications: [], integrations: {} };
const refresh = vi.fn(async () => undefined);
beforeEach(() => {
  refresh.mockClear();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("deletes only a never-published root with its slot ETag and cancel initially focused", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
  const onRemoved = vi.fn();
  render(<StudyLifecycleActions slot={slot} data={data} session={session} refresh={refresh} onRemoved={onRemoved} />);
  fireEvent.click(screen.getByRole("button", { name: "Delete study" }));
  expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  fireEvent.click(screen.getAllByRole("button", { name: "Delete study" }).at(-1)!);
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/churches/church/slots/study/delete");
  expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ "If-Match": slot.etag });
  expect(onRemoved).toHaveBeenCalledWith(slot.id);
});
it("offers withdrawal after any publication even with no current live content", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
  render(<StudyLifecycleActions slot={{ ...slot, everPublished: true }} data={data} session={session} refresh={refresh} />);
  expect(screen.queryByRole("button", { name: "Delete study" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Withdraw from members" }));
  expect(screen.getByText(/historical publication and engagement records are retained/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Withdraw study" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Reason (required)"), { target: { value: "Withdraw outdated guidance" } });
  fireEvent.click(screen.getByRole("button", { name: "Withdraw study" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/churches/church/slots/study/withdraw");
});
it("requires title confirmation and a reason to Hard Delete retained history absent from active slots", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
  render(<StudyLifecycleActions studyId="retained" title="Historical study" etag='"slot:retained:4"' everPublished withdrawn data={{ ...data, slots: [] }} session={session} refresh={refresh} />);
  fireEvent.click(screen.getByRole("button", { name: "Hard Delete study" }));
  const confirm = screen.getAllByRole("button", { name: "Hard Delete study" }).at(-1)!;
  expect(confirm).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Reason (required)"), { target: { value: "Disposable test artifact" } });
  fireEvent.change(screen.getByLabelText(/Type the study title/), { target: { value: "Wrong title" } });
  expect(confirm).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/Type the study title/), { target: { value: "Historical study" } });
  fireEvent.click(confirm);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/churches/church/slots/retained/hard-delete");
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ confirmation: "PERMANENTLY DELETE retained", reason: "Disposable test artifact" });
  expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ "If-Match": '"slot:retained:4"' });
});
it("does not expose Hard Delete to contributors or for active published history", () => {
  const contributor = { ...session, churches: [{ ...church, capabilities: ["studies:delete"] }] };
  const view = render(<StudyLifecycleActions slot={{ ...slot, withdrawn: true }} data={data} session={contributor} refresh={refresh} />);
  expect(screen.queryByRole("button", { name: /Hard Delete/ })).toBeNull();
  view.rerender(<StudyLifecycleActions slot={{ ...slot, everPublished: true }} data={data} session={session} refresh={refresh} />);
  expect(screen.queryByRole("button", { name: /Hard Delete/ })).toBeNull();
});
it("retains the confirmation and explains stale lifecycle versions without retrying", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ message: "Stale" }), { status: 412 }));
  render(<StudyLifecycleActions slot={slot} data={data} session={session} refresh={refresh} />);
  fireEvent.click(screen.getByRole("button", { name: "Delete study" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Delete study" }).at(-1)!);
  expect(await screen.findByRole("alert")).toHaveTextContent("This study changed");
  expect(refresh).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
