import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AIAssistance } from "./ai-assistance";
import type { Aggregate } from "../lib/types";
import type { Session } from "../lib/api";

const aggregate: Aggregate = { id: "plan", kind: "plan", slotId: "monday", planId: null, status: "draft", version: 1, etag: '"1"', headRevisionId: "revision-1", head: { id: "revision-1", number: 1, hash: "hash", authorId: "contributor", payload: { title: "Original plan" }, createdAt: new Date().toISOString() }, approvalId: null };
const session: Session = { user: { id: "contributor", displayName: "Writer" }, churches: [{ id: "grace", slug: "grace", name: "Grace", capabilities: ["ai:use"] }], csrfToken: "csrf" };
const provider = { externalServicesEnabled: true, openai: { configured: true, liveVerified: false }, transcription: { configured: false }, twilio: { configured: false, liveVerified: false }, connections: [] };
const response = (value: unknown) => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("requests a separate weekly proposal for the selected calendar without adopting fields", async () => {
  const commands: Record<string, unknown>[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, options) => {
    const path = String(input);
    if (path.endsWith("/status")) return response(provider);
    if (path.endsWith("/sources")) return response({ items: [{ id: "reviewed-source", reviewed: true, payload: { spans: [{ id: "span-1", text: "Source note" }] } }] });
    if (path.endsWith("/ai/proposals")) return response({ items: [] });
    commands.push(JSON.parse(String(options?.body)));
    return response({ id: "job", status: "pending" });
  });
  const onAdopt = vi.fn(); const prepare = vi.fn(async () => aggregate);
  render(<AIAssistance churchId="grace" aggregate={aggregate} session={session} mode="proposal" prepare={prepare} onAdopt={onAdopt} unsaved={false} dates={["2026-10-19", "2026-10-21", "2026-10-23"]} selectedDate="2026-10-19" />);
  await screen.findByText("AI is configured. Generated material requires source and pastoral review.");
  fireEvent.change(screen.getByLabelText("Proposal scope"), { target: { value: "week_outline" } });
  fireEvent.change(screen.getByLabelText("What would you like help with?"), { target: { value: "Suggest a faithful weekly direction" } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Generate proposal" }));
  await waitFor(() => expect(commands).toHaveLength(1));
  expect(commands[0]).toMatchObject({ workflow: "week_outline", aggregateId: "plan", baseRevisionId: "revision-1", explicitAction: true, dates: ["2026-10-19", "2026-10-21", "2026-10-23"], sourceIds: ["reviewed-source"] });
  expect(onAdopt).not.toHaveBeenCalled();
});

it("keeps a full-study body proposal inspectable until field replacement is explicitly confirmed", async () => {
  const content = { ...aggregate, id: "content", kind: "content", planId: "plan", head: { ...aggregate.head!, payload: { body: "Original body" } } };
  const commands: { body: Record<string, unknown>; headers: Record<string, string> }[] = [];
  const proposal = { id: "proposal", aggregate_id: "content", base_revision_id: "revision-1", proposal: { fields: [{ path: "body", date: null, suggestion: "Proposed body", evidence: [{ sourceId: "source", spanId: "span" }], scriptureReferences: ["John 6:68"], warnings: ["Requires contextual review"] }], provenance: { model: "configured-model", promptVersion: "prompt-v1", profileVersion: "profile-v1", sources: [] } } };
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, options) => {
    const path = String(input);
    if (path.endsWith("/status")) return response(provider);
    if (path.endsWith("/sources")) return response({ items: [] });
    if (path.endsWith("/ai/proposals")) return response({ items: [proposal] });
    commands.push({ body: JSON.parse(String(options?.body)), headers: options?.headers as Record<string, string> });
    return response({ ...content, version: 2, etag: '"2"' });
  });
  const onAdopt = vi.fn();
  render(<AIAssistance churchId="grace" aggregate={content} session={session} mode="proposal" prepare={async () => content} onAdopt={onAdopt} unsaved={false} />);
  expect(await screen.findByText("Proposed body")).toBeInTheDocument();
  expect(screen.getByLabelText("Proposal scope")).toHaveValue("study_draft");
  expect(onAdopt).not.toHaveBeenCalled(); expect(commands).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Compare & use in body" }));
  expect(screen.getByText('"Original body"')).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Confirm replacement in this field" }));
  await waitFor(() => expect(onAdopt).toHaveBeenCalledOnce());
  expect(commands[0].body).toEqual({ fields: ["body"], confirmedReplacement: true });
  expect(commands[0].headers["If-Match"]).toBe('"1"');
});
