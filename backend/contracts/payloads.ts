import { z } from 'zod';

export const planPayloadSchema = z.object({
  schemaVersion: z.literal(1), title: z.string().max(500),
  primaryScripture: z.object({ reference: z.string().max(500), translation: z.string().max(100).nullable() }),
  learningObjective: z.string().max(10000), outline: z.array(z.string().max(10000)).max(100),
  discussionQuestion: z.string().max(10000), notes: z.string().max(50000), extensions: z.array(z.unknown()).max(50),
}).strict();

export const contentPayloadSchema = z.object({
  schemaVersion: z.literal(1), title: z.string().max(500), body: z.string().max(100000),
  reflection: z.string().max(20000), discussionQuestion: z.string().max(10000), application: z.string().max(20000),
  references: z.array(z.string().max(1000)).max(100), outboundPreview: z.string().max(2000),
}).strict();
