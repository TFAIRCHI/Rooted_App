export const contractSchemaFingerprint = "eba1aa0299bb801c07ca42d41e7a222e38fde45d38c9230bff9e9ef008dd2443";

export type PlanPayload = { "schemaVersion": 1; "title": string; "primaryScripture": { "reference": string; "translation": string | null; }; "learningObjective": string; "outline": Array<string>; "discussionQuestion": string; "notes": string; "extensions": Array<unknown>; };

export type ContentPayload = { "schemaVersion": 1; "title": string; "body": string; "reflection": string; "discussionQuestion": string; "application": string; "references": Array<string>; "outboundPreview": string; "scriptureReading"?: { "reference": string; "translation": "KJV"; "edition": "1769"; "source": string; "digest": string; "verses": Array<{ "number": number; "text": string; }>; "featuredVerse": number; }; };
