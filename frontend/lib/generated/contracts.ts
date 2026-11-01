export const contractSchemaFingerprint = "3429190651b54c91ed4cd19fdd89ef5cb62741514e66458f74c24e0796761948";

export type PlanPayload = { "schemaVersion": 1; "title": string; "primaryScripture": { "reference": string; "translation": string | null; }; "learningObjective": string; "outline": Array<string>; "discussionQuestion": string; "notes": string; "extensions": Array<unknown>; };

export type ContentPayload = { "schemaVersion": 1; "title": string; "body": string; "reflection": string; "discussionQuestion": string; "application": string; "references": Array<string>; "outboundPreview": string; };
