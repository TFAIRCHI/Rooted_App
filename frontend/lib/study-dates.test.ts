import { describe, expect, it } from "vitest";
import { churchToday, hasPublication, monthWeeks, shiftMonth } from "./study-dates";

describe("church civil dates", () => {
  it("clips Sunday–Saturday weeks at the month boundaries without gaps", () => {
    expect(monthWeeks("2026-10")).toEqual([
      { number: 1, start: "2026-10-01", end: "2026-10-03" },
      { number: 2, start: "2026-10-04", end: "2026-10-10" },
      { number: 3, start: "2026-10-11", end: "2026-10-17" },
      { number: 4, start: "2026-10-18", end: "2026-10-24" },
      { number: 5, start: "2026-10-25", end: "2026-10-31" },
    ]);
    expect(monthWeeks("2028-02").at(-1)?.end).toBe("2028-02-29");
    expect(monthWeeks("2026-08")).toHaveLength(6);
  });
  it("uses the church date across midnight, DST, and year boundaries", () => {
    expect(churchToday("America/New_York", new Date("2027-01-01T01:00:00Z"))).toBe("2026-12-31");
    expect(churchToday("Pacific/Auckland", new Date("2026-10-21T23:00:00Z"))).toBe("2026-10-22");
    expect(churchToday("America/New_York", new Date("2026-11-01T06:30:00Z"))).toBe("2026-11-01");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
  it("preserves the ever-published distinction after a replacement draft loses its live pointer", () => {
    const slot = { id: "study", planId: "plan", seriesId: "old", localDate: "2026-10-21", localTime: "08:00", timeZone: "UTC", assigneeIds: [], everPublished: true };
    expect(hasPublication(slot, { content: [] })).toBe(true);
    expect(hasPublication({ ...slot, everPublished: false, withdrawnAt: "2026-10-22T00:00:00Z" }, { content: [] })).toBe(true);
  });
});
