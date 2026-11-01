import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlanEditor } from "./plan-editor";
import { blankPlan, planPayload, recoveryKey } from "../lib/drafts";
import type { Aggregate, WorkspaceData } from "../lib/types";
import type { Session } from "../lib/api";

const slot = { id: "monday", seriesId: "week", localDate: "2026-10-19", localTime: "08:00", timeZone: "America/New_York", assigneeIds: ["contributor"], planId: "plan" };
const church = { id: "grace", slug: "grace", name: "Grace", capabilities: ["workspace:read", "plans:edit", "content:edit"] };
const session: Session = { user: { id: "contributor", displayName: "Anna" }, churches: [church], csrfToken: "csrf-token" };
const initial: Aggregate = { id: "plan", kind: "plan", slotId: slot.id, planId: null, status: "draft", version: 1, etag: '"1"', headRevisionId: null, head: null, approvalId: null };
const data: WorkspaceData = { church, members: [], sermons: [], series: [], slots: [slot], plans: [initial], content: [], notifications: [], integrations: {} };
const refresh = vi.fn(async () => undefined);

function revision(title: string, version: number): Aggregate { return { ...initial, version, etag: `"${version}"`, headRevisionId: `revision-${version}`, head: { id: `revision-${version}`, number: version, hash: `hash-${version}`, authorId: "contributor", createdAt: new Date().toISOString(), payload: planPayload({ ...blankPlan(), title }) } }; }
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
beforeEach(() => { localStorage.clear(); refresh.mockClear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("date editor", () => {
  it("offers exactly two creation choices and starts all six manual fields blank", () => {
    render(<PlanEditor slot={slot} initialPlan={initial} data={data} session={session} refresh={refresh} />);
    const select = screen.getByTestId("creation-method");
    expect(Array.from((select as HTMLSelectElement).options).filter(option => !option.disabled).map(option => option.text)).toEqual(["View proposed study plan", "Create study plan from scratch"]);
    fireEvent.change(select, { target: { value: "manual" } });
    for (const field of ["title", "scripture", "objective", "outline", "question", "notes"]) expect(screen.getByTestId(`plan-${field}`)).toHaveValue("");
  });
  it("drains optional context edits before returning the latest revision to the final study workflow", async () => {
    let flush: (() => Promise<Aggregate | null>) | null = null;
    let resolveFirst: ((value: Response) => void) | undefined;
    const bodies: { path: string; body: Record<string, unknown>; headers: Record<string, string> }[] = [];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const path = String(input); const body = JSON.parse(String(init?.body ?? "{}")); bodies.push({ path, body, headers: init?.headers as Record<string, string> });
      if (path.endsWith("/revisions") && bodies.filter(item => item.path.endsWith("/revisions")).length === 1) return new Promise<Response>(resolve => { resolveFirst = resolve; });
      if (path.endsWith("/revisions")) return response(revision(body.payload.title, 3));
      return response({ ...revision("Newest text", 3), status: "in_review" });
    });
    render(<PlanEditor slot={slot} initialPlan={initial} data={data} session={session} refresh={refresh} registerSave={save => { flush = save; }} />);
    fireEvent.change(screen.getByTestId("creation-method"), { target: { value: "manual" } });
    fireEvent.change(screen.getByTestId("plan-title"), { target: { value: "First text" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByTestId("plan-title"), { target: { value: "Newest text" } });
    const drained = flush!();
    await act(async () => { resolveFirst!(response(revision("First text", 2))); await drained; });
    const saves = bodies.filter(item => item.path.endsWith("/revisions"));
    expect(saves).toHaveLength(2);
    expect(saves[1].body).toMatchObject({ baseRevisionId: "revision-2", payload: { title: "Newest text" } });
    expect(saves[1].headers["If-Match"]).toBe('"2"');
    expect((await drained)?.headRevisionId).toBe("revision-3");
    expect(bodies.some(item => item.path.endsWith("/submit"))).toBe(false);
  });
  it("requires conflict resolution when a recovered copy has an older base revision", async () => {
    const key = recoveryKey("contributor", "grace", slot.id);
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), baseRevisionId: "revision-1", base: { ...blankPlan(), title: "Base writing" }, draft: { ...blankPlan(), title: "My offline writing" } }));
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<PlanEditor slot={slot} initialPlan={revision("New server writing", 2)} data={data} session={session} refresh={refresh} />);
    fireEvent.click(await screen.findByRole("button", { name: "Restore local draft" }));
    expect(screen.getByText("A newer draft exists.")).toBeInTheDocument();
    expect(screen.getByText("Base writing")).toBeInTheDocument();
    expect(screen.getByText("New server writing")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
    expect(screen.queryByTestId("plan-submit")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("stops command draining after date unmount and retains unsynced newer writing for recovery", async () => {
    let flush: (() => Promise<Aggregate | null>) | null = null;
    let resolveSave: ((value: Response) => void) | undefined;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise<Response>(resolve => { resolveSave = resolve; }));
    const view = render(<PlanEditor slot={slot} initialPlan={initial} data={data} session={session} refresh={refresh} registerSave={save => { flush = save; }} />);
    fireEvent.change(screen.getByTestId("creation-method"), { target: { value: "manual" } });
    fireEvent.change(screen.getByTestId("plan-title"), { target: { value: "First save" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByTestId("plan-title"), { target: { value: "Newer unsynced writing" } });
    const drained = flush!();
    view.unmount();
    await act(async () => { resolveSave!(response(revision("First save", 2))); await drained; });
    expect(await drained).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
    const local = JSON.parse(localStorage.getItem(recoveryKey("contributor", "grace", slot.id))!);
    expect(local.draft.title).toBe("Newer unsynced writing");
    expect(local.baseRevisionId).toBeNull();
  });
});
