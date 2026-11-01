import { z } from 'zod';
import { contentPayloadSchema } from './payloads.js';

export const directionSchema = z.object({
  audience: z.string().trim().min(1).max(500), takeaway: z.string().trim().min(1).max(1000),
  depth: z.string().trim().min(1).max(300), translation: z.string().trim().min(1).max(200),
  illustrations: z.string().max(1000), application: z.string().trim().min(1).max(1000),
}).strict();
export const dayPlanSchema = z.object({
  date: z.iso.date(), title: z.string().trim().min(1).max(500), objective: z.string().trim().min(1).max(1000),
  theme: z.string().trim().min(1).max(1000), references: z.array(z.string().trim().min(1).max(100)).min(1).max(10),
}).strict();
export const workflowPlanSchema = z.object({
  theme: z.string().trim().min(1).max(1000), progression: z.string().trim().min(1).max(1500),
  weekStart: z.iso.date(), direction: directionSchema, days: z.array(dayPlanSchema).min(1).max(7),
  questions: z.array(z.string().min(1).max(500)).max(3), assumptions: z.array(z.string().min(1).max(500)).max(10),
}).strict();
export const completeDaySchema = z.object({
  date: z.iso.date(), content: contentPayloadSchema,
  evidence: z.array(z.object({ field: z.enum(['title','references','body','reflection','discussionQuestion','application','outboundPreview']), sourceId: z.string().uuid(), spanId: z.literal('outline') }).strict()).min(7).max(21),
  warnings: z.array(z.string().min(1).max(500)).max(10),
}).strict();
export type WorkflowPlan = z.infer<typeof workflowPlanSchema>;
export type CompleteDay = z.infer<typeof completeDaySchema>;
export type WorkflowState = 'plan_queued'|'planning'|'direction_review'|'awaiting_generation_confirmation'|'queued'|'generating'|'paused_conflict'|'failed'|'canceled'|'drafts_saved'|'erased';
export interface WorkflowSummary {
  conversationSource: boolean; sourceReviewed: boolean;
  sequential: boolean; intentConfirmed: boolean;
  id: string; state: WorkflowState; version: number; sourceHash: string; profileHash: string; planHash:string|null;
  seriesId: string | null; assigneeId: string; localTime: string; timeZone: string; plan: WorkflowPlan | null;
  sourceId: string; sourceText: string; messages: {role:'user'|'assistant';text:string}[];
  jobs: {id:string;kind:string;date:string|null;state:string;error:string|null;usage:{inputTokens:number;outputTokens:number}|null}[];
  mapping: {date:string;slotId:string;planId:string;contentId:string;revisionId:string}[];
  tokensUsed: number; tokensReserved: number; attempts: number; error: string|null; expiresAt:string;
}
