import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';

export const communityPolicyVersion = 'rooted-community-rules-v1';
export interface CommunityVerdict { verdict: 'policy_violation' | 'needs_review'; reasons: string[]; policyVersion: string }

export function evaluateCommunityText(body: string): CommunityVerdict {
  const normalized = body.normalize('NFKC').replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, '').toLowerCase();
  const review = (reason: string): CommunityVerdict => ({ verdict: 'needs_review', reasons: [reason], policyVersion: communityPolicyVersion });
  if (/["“”«»]/.test(normalized) || /\b(?:quot(?:e|ed|ing)|someone (?:said|called)|what does .* mean|scripture says)\b/.test(normalized)) return review('context_requires_review');
  const rules: [string, RegExp][] = [
    ['personal_attack', /\b(?:you(?:'re| are)|he is|she is|they are)\s+(?:(?:a|an|all|just|such|complete|total|fucking|damn)\s+)*(?:idiot|idiots|moron|morons|stupid|worthless|pathetic|scum|loser|losers)\b/],
    ['harassment', /\b(?:shut (?:the (?:hell|fuck) )?up|go kill yourself|nobody should listen to you|you deserve to (?:die|suffer))\b/],
    ['direct_threat', /\bi(?:'ll| will| am going to)\s+(?:kill|hurt|attack|shoot)\s+(?:you|your family|them)\b/],
    ['targeted_abuse', /\b(?:i hate you|you people are (?:disgusting|vermin)|get lost[,! ]+idiot)\b/]
  ];
  const matches = rules.filter(([, pattern]) => pattern.test(normalized)).map(([reason]) => reason);
  return matches.length ? { verdict: 'policy_violation', reasons: matches, policyVersion: communityPolicyVersion } : review('human_review_required');
}

export async function screenComment(client: PoolClient, churchId: string, comment: { id: string; body: string; content_version: number }) {
  const evaluation = evaluateCommunityText(comment.body);
  await client.query('INSERT INTO discussion_evaluations(church_id,id,discussion_id,content_version,policy_version,input_hash,verdict,reason_codes) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING', [churchId, randomUUID(), comment.id, comment.content_version, evaluation.policyVersion, createHash('sha256').update(comment.body).digest('hex'), evaluation.verdict, JSON.stringify(evaluation.reasons)]);
  if (evaluation.verdict === 'policy_violation') await client.query("UPDATE discussions SET status='declined',updated_at=now() WHERE church_id=$1 AND id=$2 AND content_version=$3 AND status='pending'", [churchId, comment.id, comment.content_version]);
  return evaluation;
}
