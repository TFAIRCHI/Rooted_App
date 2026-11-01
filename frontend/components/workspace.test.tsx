import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Workspace } from "./workspace";
import type { WorkspaceData } from "../lib/types";

vi.mock("./studies-with-calendar-move", () => ({ StudiesWithCalendarMove: ({ data }: { data: WorkspaceData }) => <div data-testid="loaded-church">{data.church.name}</div> }));
const churches = [
  { id: "first", slug: "first", name: "First Church", capabilities: ["workspace:read"] },
  { id: "second", slug: "second", name: "Second Church", capabilities: ["workspace:read"] },
];
const session = { user: { id: "writer", displayName: "Writer" }, churches, csrfToken: "csrf" };
const workspace = (index: number) => ({ church: churches[index], members: [], sermons: [], series: [], slots: [], plans: [], content: [], notifications: [], integrations: {} });
const response = (value: unknown) => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });
afterEach(() => { cleanup(); vi.restoreAllMocks(); window.history.replaceState(null, "", "/"); });

it("ignores a delayed response from the previous church after a workspace switch", async () => {
  let resolveFirst: ((value: Response) => void) | undefined;
  vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
    const path = String(input);
    if (path.endsWith("/auth/session")) return response(session);
    if (path.endsWith("/first/workspace")) return new Promise<Response>(resolve => { resolveFirst = resolve; });
    return response(workspace(1));
  });
  render(<Workspace route="studies" />);
  await screen.findByTestId("church-switcher");
  await waitFor(() => expect(resolveFirst).toBeDefined());
  fireEvent.change(screen.getByTestId("church-switcher"), { target: { value: "second" } });
  await waitFor(() => expect(screen.getByTestId("loaded-church")).toHaveTextContent("Second Church"));
  await act(async () => { resolveFirst!(response(workspace(0))); });
  expect(screen.getByTestId("loaded-church")).toHaveTextContent("Second Church");
  expect(screen.getByTestId("church-switcher")).toHaveValue("second");
});

it("revalidates the current workspace on focus and stops listening after unmount", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async input => response(String(input).endsWith("/auth/session") ? session : workspace(0)));
  const view = render(<Workspace route="studies" />);
  await screen.findByTestId("loaded-church");
  expect(fetchMock).toHaveBeenCalledTimes(2);
  fireEvent(window, new Event("focus"));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
  view.unmount();
  fireEvent(window, new Event("focus"));
  expect(fetchMock).toHaveBeenCalledTimes(4);
});
