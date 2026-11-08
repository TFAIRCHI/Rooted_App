import type { ContentPayload } from "./generated/contracts";

export type ContentDraft = Pick<ContentPayload, "title" | "body" | "reflection" | "discussionQuestion" | "application" | "outboundPreview"> & { referencesText?: string; featuredVerse?: number };

export function contentPayload(draft: ContentDraft, existing: Record<string, unknown> = {}): ContentPayload {
  const references = existing.references;
  const { referencesText, featuredVerse, ...fields } = draft;
  const scriptureReading = existing.scriptureReading as ContentPayload["scriptureReading"] | undefined;
  return { ...existing, schemaVersion: 1, ...fields, ...(scriptureReading ? { scriptureReading: { ...scriptureReading, featuredVerse: featuredVerse ?? scriptureReading.featuredVerse } } : {}), references: referencesText === undefined ? Array.isArray(references) && references.every(reference => typeof reference === "string") ? references : [] : referencesText.split("\n").map(reference => reference.trim()).filter(Boolean) };
}
