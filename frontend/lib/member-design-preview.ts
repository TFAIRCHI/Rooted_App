import type { Publication } from "./member-server";

// Reference examples for the explicit development-only ?preview=figma view.
// These records are never published or written to the church database.
export function memberDesignExamples(churchId: string): Publication[] {
  return [
    { id: "figma-previous-02", churchId, contentId: "figma-previous-02", publishedAt: "2026-10-14T12:00:00Z", payload: { title: "Be still, even here.", references: ["Psalm 46"], body: "Scripture: Psalm 46\n\nFind a quiet moment and spend time with the passage.", reflection: "Notice what draws your attention or challenges you.", discussionQuestion: "What thought will you carry into the week?", application: "Take one thought or prayer with you into the week." } },
    { id: "figma-previous-01", churchId, contentId: "figma-previous-01", publishedAt: "2026-10-07T12:00:00Z", payload: { title: "Grace for today.", references: ["Matthew 6"], body: "Scripture: Matthew 6\n\nFind a quiet moment and spend time with the passage.", reflection: "Notice what draws your attention or challenges you.", discussionQuestion: "What thought will you carry into the week?", application: "Take one thought or prayer with you into the week." } },
  ];
}
