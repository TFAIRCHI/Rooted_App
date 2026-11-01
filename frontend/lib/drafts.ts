export const planFields = [
  ["title", "Plan title"],
  ["primaryScripture", "Primary Scripture reference"],
  ["learningObjective", "Learning objective"],
  ["outline", "Outline / key points"],
  ["discussionQuestion", "Discussion question"],
  ["notes", "Optional notes"],
] as const;

export type PlanDraft = Record<(typeof planFields)[number][0], string>;
export const blankPlan = (): PlanDraft => ({ title: "", primaryScripture: "", learningObjective: "", outline: "", discussionQuestion: "", notes: "" });
export type Recovery = { savedAt: number; draft: PlanDraft; baseRevisionId: string | null; base?: PlanDraft };
const rootedDraftPrefix = "rooted:draft:";
const legacyDraftPrefix = "gather:draft:";
export const recoveryKey = (userId: string, churchId: string, slotId: string) => `${rootedDraftPrefix}${userId}:${churchId}:${slotId}`;
export const legacyRecoveryKey = (key: string) => key.startsWith(rootedDraftPrefix) ? `${legacyDraftPrefix}${key.slice(rootedDraftPrefix.length)}` : null;

export function readRecovery(key: string, now = Date.now()): Recovery | null {
  const legacyKey = legacyRecoveryKey(key);
  let sourceKey = key;
  try {
    let raw = localStorage.getItem(key);
    if (!raw && legacyKey) { sourceKey = legacyKey; raw = localStorage.getItem(legacyKey); }
    if (!raw) return null;
    const value = JSON.parse(raw) as Recovery;
    if (typeof value.savedAt !== "number" || value.savedAt > now || now - value.savedAt > 24 * 60 * 60 * 1000 || !value.draft || planFields.some(([field]) => typeof value.draft[field] !== "string")) {
      localStorage.removeItem(sourceKey);
      return null;
    }
    if (value.base && planFields.some(([field]) => typeof value.base?.[field] !== "string")) delete value.base;
    if (sourceKey !== key) { localStorage.setItem(key, JSON.stringify(value)); localStorage.removeItem(sourceKey); }
    return value;
  } catch {
    return null;
  }
}

export function clearRecoveries() {
  for (const key of Object.keys(localStorage)) if (key.startsWith(rootedDraftPrefix) || key.startsWith(legacyDraftPrefix)) localStorage.removeItem(key);
}

export function planPayload(draft: PlanDraft, existing: Partial<PlanPayload> & Record<string, unknown> = {}): PlanPayload {
  return { schemaVersion: 1, extensions: [], ...existing, ...draft, primaryScripture: { translation: null, ...(typeof existing.primaryScripture === "object" ? existing.primaryScripture : {}), reference: draft.primaryScripture }, outline: draft.outline.split("\n").filter(Boolean) };
}

export function planFromPayload(payload?: Record<string, unknown> | null): PlanDraft {
  if (!payload) return blankPlan();
  return Object.fromEntries(planFields.map(([field]) => [field, field === "primaryScripture" ? typeof payload[field] === "string" ? payload[field] : (payload[field] as { reference?: string })?.reference ?? "" : Array.isArray(payload[field]) ? payload[field].join("\n") : String(payload[field] ?? "")])) as PlanDraft;
}
import type { PlanPayload } from "./generated/contracts";

