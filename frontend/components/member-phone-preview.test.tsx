import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemberPhonePreview } from "./member-phone-preview";

const draft = { title: "To Whom Shall We Go?", body: "Stay close to Jesus.", reflection: "What are you holding onto?", discussionQuestion: "Where do you need trust?", application: "Take one faithful step.", outboundPreview: "Read today's study with us.", referencesText: "John 6:68" };

describe("member phone preview", () => {
  it("shows the member draft and switches to the message view", () => {
    render(<MemberPhonePreview draft={draft} churchName="Grace Community Church" />);
    expect(screen.getByText("To Whom Shall We Go?")).toBeVisible();
    fireEvent.click(screen.getByRole("tab", { name: "Message view" }));
    expect(screen.getByText("Read today's study with us.")).toBeVisible();
    expect(screen.getByText("Draft only")).toBeVisible();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Message view" }), { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "Member view" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", screen.getByRole("tab", { name: "Member view" }).id);
    fireEvent.click(screen.getByRole("button", { name: "Hide phone preview" }));
    expect(screen.queryByRole("tabpanel")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show phone preview" }));
    expect(screen.getByRole("tabpanel")).toBeVisible();
  });
});
