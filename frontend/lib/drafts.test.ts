import { beforeEach, describe, expect, it } from "vitest";
import { blankPlan, clearRecoveries, planFromPayload, planPayload, readRecovery, recoveryKey } from "./drafts";

beforeEach(() => localStorage.clear());

describe("draft recovery", () => {
  it("expires device copies after 24 hours and removes expired content", () => {
    const key = recoveryKey("anna", "grace", "monday");
    localStorage.setItem(key, JSON.stringify({ draft: blankPlan(), savedAt: 1000, baseRevisionId: "revision-1" }));
    expect(readRecovery(key, 1000 + 86400001)).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });
  it("separates user, tenant, and selected date and clears on sign out", () => {
    const key = recoveryKey("anna", "grace", "monday");
    localStorage.setItem(key, JSON.stringify({ draft: { ...blankPlan(), title: "Local writing" }, savedAt: Date.now(), baseRevisionId: "revision-1" }));
    expect(readRecovery(recoveryKey("anna", "riverside", "monday"))).toBeNull();
    expect(readRecovery(recoveryKey("pastor", "grace", "monday"))).toBeNull();
    expect(readRecovery(recoveryKey("anna", "grace", "friday"))).toBeNull();
    expect(readRecovery(key)?.draft.title).toBe("Local writing");
    clearRecoveries(); expect(readRecovery(key)).toBeNull();
  });
  it("moves an existing local recovery to the Rooted key without losing draft text", () => {
    const key = recoveryKey("anna", "grace", "monday");
    const legacyKey = `gather:draft:anna:grace:monday`;
    const value = { draft: { ...blankPlan(), title: "Unsynced church writing" }, savedAt: Date.now(), baseRevisionId: "revision-1" };
    localStorage.setItem(legacyKey, JSON.stringify(value));
    expect(readRecovery(key)?.draft.title).toBe("Unsynced church writing");
    expect(localStorage.getItem(legacyKey)).toBeNull();
    expect(localStorage.getItem(key)).toContain("Unsynced church writing");
  });
  it("rejects malformed field values instead of restoring an unsafe buffer", () => {
    localStorage.setItem("bad", JSON.stringify({ savedAt: Date.now(), draft: { title: 42 } }));
    expect(readRecovery("bad")).toBeNull();
  });
});

describe("plan payload preservation", () => {
  it("preserves translation, extensions, and unknown schema metadata while changing typed fields", () => {
    const original = { title: "Original", primaryScripture: { reference: "John 6:68", translation: "KJV", quotationRights: "church-authorized" }, extensions: [{ id: "prayer", text: "Preserved" }], sourceRevisionIds: ["source-2"] };
    const draft = planFromPayload(original); draft.title = "Updated";
    const payload = planPayload(draft, original);
    expect(payload.primaryScripture).toEqual(original.primaryScripture);
    expect(payload.extensions).toEqual(original.extensions);
    expect(payload).toMatchObject({ title: "Updated", sourceRevisionIds: ["source-2"] });
  });
});
