import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ContentDraft } from "../lib/content";
import { StudyComposer } from "./study-composer";
import { StudyCowriter } from "./study-cowriter";
import type { Aggregate } from "../lib/types";
import type { Session } from "../lib/api";

const study: Aggregate = { id: "study", kind: "content", slotId: "slot", planId: "plan", status: "draft", version: 1, etag: '"study:1"', headRevisionId: "revision", head: null, approvalId: null };
const session: Session = { user: { id: "contributor", displayName: "Contributor" }, churches: [{ id: "church", name: "Test church", slug: "church", capabilities: ["ai:use"] }], csrfToken: "csrf" };
const cowriterProps = { title: "A heart that listens", date: "Monday", churchId: "church", study, session, unsaved: false, onAdopt: vi.fn(), prepare: () => study };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const draft: ContentDraft = {
  title: "A heart that listens",
  body: "Read the passage.",
  reflection: "",
  discussionQuestion: "",
  application: "",
  outboundPreview: "",
  referencesText: "",
};
function Composer() {
  const [value, setValue] = useState(draft);
  return (
    <StudyComposer
      draft={value}
      disabled={false}
      edit={(field, text) =>
        setValue((current) => ({ ...current, [field]: text }))
      }
    />
  );
}

it("inserts hosted image links into the persisted study body and rejects executable URLs", () => {
  render(<Composer />);
  fireEvent.click(screen.getByRole("button", { name: "Add media" }));
  fireEvent.click(screen.getByRole("button", { name: /Image.*hosted image/ }));
  fireEvent.change(screen.getByLabelText("HTTPS URL"), {
    target: { value: "javascript:alert(1)" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Insert into study" }));
  expect(screen.getByRole("alert")).toHaveTextContent("valid HTTPS URL");
  expect(screen.getByTestId("content-body")).toHaveValue("Read the passage.");
  fireEvent.change(screen.getByLabelText("HTTPS URL"), {
    target: { value: "https://example.org/sermon.jpg" },
  });
  fireEvent.change(screen.getByLabelText("Image description"), {
    target: { value: "The sermon slide" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Insert into study" }));
  expect(
    (screen.getByTestId("content-body") as HTMLTextAreaElement).value,
  ).toContain("![The sermon slide](https://example.org/sermon.jpg)");
});

it("formats the selected passage without losing the surrounding study", () => {
  render(<Composer />);
  const textarea = screen.getByTestId("content-body") as HTMLTextAreaElement;
  textarea.setSelectionRange(5, 8);
  fireEvent.click(screen.getByRole("button", { name: "Bold" }));
  expect(textarea).toHaveValue("Read **the** passage.");
});

it("requires reviewed sources for weekly planning without sending a model request", async () => {
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async input => Response.json(String(input).endsWith("/conversations") ? { items: [] } : { configured: true }));
  render(<StudyCowriter {...cowriterProps} />);
  fireEvent.click(screen.getByRole("button", { name: "Open study co-writer" }));
  fireEvent.click(screen.getByRole("button", { name: "Co-writer menu" }));
  fireEvent.click(
    screen.getByRole("button", { name: /Build the weekly plan/ }),
  );
  expect(
    screen.getByRole("textbox", { name: "Message the study co-writer" }),
  ).toHaveValue(
    "Build a concise weekly outline from the reviewed sermon for the selected dates.",
  );
  await waitFor(() => expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("confirm sermon text"));
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls.map(call => call[0])).toEqual(expect.arrayContaining([expect.stringContaining("/cowriter/status"),expect.stringContaining("/cowriter/conversations")]));
});

it("opens from the floating launcher and preserves writing when closed and reopened", () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ configured: true }));
  render(<StudyCowriter {...cowriterProps} />);
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Open study co-writer" }));
  expect(screen.getByRole("dialog", { name: "Study co-writer" })).toBeVisible();
  fireEvent.change(screen.getByRole("textbox", { name: "Message the study co-writer" }), { target: { value: "Keep my unfinished question" } });
  fireEvent.click(screen.getByRole("button", { name: "Close study co-writer" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Open study co-writer" }));
  expect(screen.getByRole("textbox", { name: "Message the study co-writer" })).toHaveValue("Keep my unfinished question");
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("previews a selected study Scripture action and waits for confirmation before saving", async () => {
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });
  const onAdopt = vi.fn();
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
    const url = String(input);
    if (url.endsWith("/status")) return Response.json({ configured: true });
    if (url.endsWith("/conversations")) return Response.json({ items: [] });
    if (url.endsWith("/actions/preview")) return Response.json({ reference: "John 6:68", verses: [{ number: 68, text: "Thou hast the words of eternal life." }] });
    if (url.endsWith("/actions/apply")) return Response.json({ kind: "full_kjv", study });
    throw new Error(`Unexpected request: ${url}`);
  });
  render(<StudyCowriter {...cowriterProps} onAdopt={onAdopt} slotId="slot" slotEtag='"slot:slot:1"' />);
  fireEvent.click(screen.getByRole("button", { name: "Open study co-writer" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Message the study co-writer" }), { target: { value: "Show the entire Bible verse in this study" } });
  await waitFor(() => expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await waitFor(() => expect(screen.getByRole("region", { name: "Review Co-Writer action" })).toHaveTextContent("John 6:68"));
  expect(fetch.mock.calls.some(call => String(call[0]).endsWith("/actions/apply"))).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Confirm and apply" }));
  await waitFor(() => expect(onAdopt).toHaveBeenCalledWith(study));
});
