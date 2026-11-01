import type { ContentPayload } from "./generated/contracts";

export type ContentDraft = Pick<ContentPayload, "title" | "body" | "reflection" | "discussionQuestion" | "application" | "outboundPreview"> & { referencesText?: string };

export function contentPayload(draft: ContentDraft, existing: Record<string, unknown> = {}): ContentPayload {
  const references = existing.references;
  const { referencesText, ...fields } = draft;
  return { ...existing, schemaVersion: 1, ...fields, references: referencesText === undefined ? Array.isArray(references) && references.every(reference => typeof reference === "string") ? references : [] : referencesText.split("\n").map(reference => reference.trim()).filter(Boolean) };
}
