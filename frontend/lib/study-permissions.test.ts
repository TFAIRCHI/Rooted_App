import { expect, it } from "vitest";
import { canEditStudy } from "./study-permissions";

const slot = { id: "study", seriesId: "series", planId: "plan", localDate: "2031-01-06", localTime: "08:00", timeZone: "UTC", assigneeIds: ["other"] };
it("allows a full contributor to edit any study while preserving explicit editing capabilities", () => {
  expect(canEditStudy(["series:manage", "content:edit"], slot, "writer", "content:edit")).toBe(true);
  expect(canEditStudy(["content:edit"], slot, "writer", "content:edit")).toBe(false);
  expect(canEditStudy(["content:edit"], slot, "other", "content:edit")).toBe(true);
  expect(canEditStudy(["admin:manage"], slot, "admin", "content:edit")).toBe(false);
});
