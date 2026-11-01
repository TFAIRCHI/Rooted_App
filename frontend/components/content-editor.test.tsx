import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContentEditor } from "./content-editor";
import { ContentEditorWithPreview } from "./content-editor-with-preview";
import type { Aggregate } from "../lib/types";
import type { Session } from "../lib/api";

const payload = { schemaVersion: 1, title: "Original study", body: "Original body", reflection: "Reflect", discussionQuestion: "Discuss?", application: "Practice", outboundPreview: "Read with us", references: ["John 6:68"] };
const initial: Aggregate = { id: "content", kind: "content", slotId: "monday", planId: "plan", status: "draft", version: 1, etag: '"1"', headRevisionId: "revision-1", head: { id: "revision-1", number: 1, hash: "hash-1", authorId: "contributor", payload, planApprovalId: "plan-approval", createdAt: new Date().toISOString() }, approvalId: null };
const plan: Aggregate = { ...initial, id: "plan", kind: "plan", planId: null, status: "approved", approvalId: "plan-approval" };
const session: Session = { user: { id: "contributor", displayName: "Contributor" }, churches: [{ id: "grace", slug: "grace", name: "Grace", capabilities: ["content:edit"] }], csrfToken: "csrf-token" };
const slot = { id: "monday", seriesId: "week", localDate: "2026-10-19", localTime: "08:00", timeZone: "America/New_York", assigneeIds: ["contributor"], planId: "plan" };
const refresh = vi.fn(async () => undefined);
const response = (value: unknown) => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });
function saved(title: string, version: number): Aggregate { return { ...initial, version, etag: `"${version}"`, headRevisionId: `revision-${version}`, head: { ...initial.head!, id: `revision-${version}`, number: version, payload: { ...payload, title } } }; }
beforeEach(() => { localStorage.clear(); refresh.mockClear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("independent content draft", () => {
  it("shows one final approval after writing, excludes self/inactive approvers, and drains saves with the selected approver", async () => {
    let resolveSave: ((value: Response) => void) | undefined;
    const beforeSubmit = vi.fn(async () => true);
    const calls: { path: string; body: Record<string, unknown>; headers: Record<string, string> }[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, options) => {
      const path = String(input);
      if (path.endsWith("/review-request")) return response({ request: null, approvers: [
        { userId: "contributor", displayName: "Self", capabilities: ["workspace:read", "content:approve"] },
        { userId: "inactive", displayName: "Inactive", active: false, capabilities: ["workspace:read", "content:approve"] },
        { userId: "reader", displayName: "Reader", capabilities: [] },
        { userId: "pastor", displayName: "James", capabilities: ["workspace:read", "content:approve"] },
      ] });
      const body = JSON.parse(String(options?.body)); calls.push({ path, body, headers: options?.headers as Record<string, string> });
      if (path.endsWith("/revisions") && calls.length === 1) return new Promise<Response>(resolve => { resolveSave = resolve; });
      if (path.endsWith("/revisions")) return response(saved(body.payload.title, 3));
      return response({ ...saved("Newest writing", 4), status: "in_review" });
    });
    render(<ContentEditor initial={initial} plan={plan} slot={slot} churchId="grace" session={session} refresh={refresh} workflow beforeSubmit={beforeSubmit} />);
    await screen.findByRole("option", { name: "James" });
    expect(screen.queryByRole("option", { name: "Self" })).toBeNull();
    expect(screen.queryByRole("option", { name: "Inactive" })).toBeNull();
    expect(screen.queryByRole("option", { name: "Reader" })).toBeNull();
    expect(screen.getAllByTestId("content-submit")).toHaveLength(1);
    expect(screen.getByTestId("content-submit")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Approver"), { target: { value: "pastor" } });
    fireEvent.change(screen.getByTestId("content-title"), { target: { value: "First writing" } });
    fireEvent.click(screen.getByRole("button", { name: "Save content" }));
    await waitFor(() => expect(calls).toHaveLength(1));
    fireEvent.change(screen.getByTestId("content-title"), { target: { value: "Newest writing" } });
    fireEvent.click(screen.getByTestId("content-submit"));
    await act(async () => { resolveSave!(response(saved("First writing", 2))); });
    await waitFor(() => expect(calls.some(call => call.path.endsWith("/submit"))).toBe(true));
    expect(beforeSubmit).toHaveBeenCalledOnce();
    expect(calls.find(call => call.path.endsWith("/submit"))).toMatchObject({ body: { revisionId: "revision-3", approverId: "pastor", note: "" }, headers: { "If-Match": '"3"' } });
    expect(calls.some(call => call.path.includes("/plans/"))).toBe(false);
  });
  it("updates the member phone preview from controlled editor state on every edit", () => {
    const view = render(<ContentEditorWithPreview initial={initial} plan={plan} slot={slot} churchId="grace" session={session} refresh={refresh} />);
    fireEvent.change(screen.getByTestId("content-title"), { target: { value: "Live changed title" } });
    fireEvent.change(screen.getByTestId("content-body"), { target: { value: "Live changed body" } });
    expect(view.container.querySelector(".iphone-study h3")).toHaveTextContent("Live changed title");
    expect(view.container.querySelector(".iphone-study")).toHaveTextContent("Live changed body");
  });
  it("drains in-flight edits, preserves source references, and submits only the latest exact revision", async () => {
    let resolveFirst: ((value: Response) => void) | undefined;
    const calls: { path: string; body: Record<string, unknown> }[] = [];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, options) => {
      const path = String(input); const body = JSON.parse(String(options?.body)); calls.push({ path, body });
      if (calls.length === 1) return new Promise<Response>(resolve => { resolveFirst = resolve; });
      if (path.endsWith("/revisions")) return response(saved(body.payload.title, 3));
      return response({ ...saved("Latest content", 3), status: "in_review" });
    });
    render(<ContentEditor initial={initial} plan={plan} slot={slot} churchId="grace" session={session} refresh={refresh} />);
    fireEvent.change(screen.getByTestId("content-title"), { target: { value: "First content" } });
    fireEvent.click(screen.getByRole("button", { name: "Save content" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByTestId("content-title"), { target: { value: "Latest content" } });
    fireEvent.click(screen.getByTestId("content-submit"));
    await act(async () => { resolveFirst!(response(saved("First content", 2))); });
    await waitFor(() => expect(calls.some(call => call.path.endsWith("/submit"))).toBe(true));
    expect(calls[1].body).toMatchObject({ baseRevisionId: "revision-2", planApprovalId: "plan-approval", payload: { title: "Latest content", references: ["John 6:68"] } });
    expect(calls[2].body).toEqual({ revisionId: "revision-3" });
  });
  it("does not submit content after the selected date unmounts during a save", async () => {
    let resolveSave: ((value: Response) => void) | undefined;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise<Response>(resolve => { resolveSave = resolve; }));
    const view = render(<ContentEditor initial={initial} plan={plan} slot={slot} churchId="grace" session={session} refresh={refresh} />);
    fireEvent.change(screen.getByTestId("content-title"), { target: { value: "Unsynced content" } });
    fireEvent.click(screen.getByTestId("content-submit"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    view.unmount();
    await act(async () => { resolveSave!(response(saved("Unsynced content", 2))); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });
});
