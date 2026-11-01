import type { PoolClient } from 'pg';

export async function snapshotPublicationAudience(client: PoolClient, churchId: string, publicationId: string) {
  const inserted = await client.query('INSERT INTO publication_audiences(church_id,publication_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING publication_id', [churchId, publicationId]);
  if (!inserted.rowCount) return;
  const captured = await client.query("INSERT INTO publication_audience_members(church_id,publication_id,user_id) SELECT church_id,$2,user_id FROM memberships WHERE church_id=$1 AND active AND NOT ('workspace:read'=ANY(capabilities)) RETURNING user_id", [churchId, publicationId]);
  await client.query('UPDATE publication_audiences SET member_count=$3 WHERE church_id=$1 AND publication_id=$2', [churchId, publicationId, captured.rowCount]);
}

export async function publicationEngagement(client: PoolClient, churchId: string, publicationId: string) {
  const audience = (await client.query('SELECT member_count,retired_at,archived_unique_opens,archived_audience_opens FROM publication_audiences WHERE church_id=$1 AND publication_id=$2', [churchId, publicationId])).rows[0];
  const opens = (await client.query('SELECT count(*)::integer AS total,count(a.user_id)::integer AS original FROM study_opens o LEFT JOIN publication_audience_members a ON a.church_id=o.church_id AND a.publication_id=o.publication_id AND a.user_id=o.user_id WHERE o.church_id=$1 AND o.publication_id=$2', [churchId, publicationId])).rows[0];
  const reactions = (await client.query('SELECT type,count(*)::integer AS count FROM reactions WHERE church_id=$1 AND publication_id=$2 GROUP BY type', [churchId, publicationId])).rows;
  const discussion = (await client.query("SELECT status,count(*)::integer AS count FROM discussions WHERE church_id=$1 AND publication_id=$2 AND parent_id IS NULL GROUP BY status", [churchId, publicationId])).rows;
  const unanswered = (await client.query("SELECT count(*)::integer AS count FROM discussions WHERE church_id=$1 AND publication_id=$2 AND kind='question' AND status='approved' AND resolved_at IS NULL", [churchId, publicationId])).rows[0].count;
  if(audience?.retired_at){opens.total=audience.archived_unique_opens;opens.original=audience.archived_audience_opens;}
  return {
    trackingState:audience?.retired_at?'retired':audience?'active':'legacy',
    trackingRetiredAt:audience?.retired_at??null,
    audienceMemberCount: audience?.member_count ?? null,
    uniqueAudienceOpens: audience ? opens.original : null,
    uniqueOpens: opens.total,
    additionalMemberOpens: audience ? opens.total - opens.original : 0,
    openPercent: audience?.member_count ? Math.round(opens.original / audience.member_count * 100) : null,
    reactions: { thankful: 0, encouraged: 0, praying: 0, like: 0, fire: 0, ...Object.fromEntries(reactions.map(row => [row.type, row.count])) } as Record<string, number>,
    discussionTotals: { pending: 0, approved: 0, hidden: 0, declined: 0, erased: 0, ...Object.fromEntries(discussion.map(row => [row.status, row.count])) } as Record<string, number>,
    questionsNeedingAnswer: unanswered
  };
}

export async function retireEngagementIdentifiers(client:PoolClient,churchId:string,now:Date) {
  const candidates=(await client.query("SELECT a.publication_id FROM publication_audiences a JOIN publications p ON p.church_id=a.church_id AND p.id=a.publication_id WHERE a.church_id=$1 AND a.retired_at IS NULL AND p.published_at<$2::timestamptz-interval '90 days' ORDER BY a.publication_id FOR UPDATE OF a",[churchId,now])).rows;
  for(const candidate of candidates){
    const summary=await publicationEngagement(client,churchId,candidate.publication_id);
    await client.query('UPDATE publication_audiences SET retired_at=$3,archived_unique_opens=$4,archived_audience_opens=$5 WHERE church_id=$1 AND publication_id=$2',[churchId,candidate.publication_id,now,summary.uniqueOpens,summary.uniqueAudienceOpens]);
    await client.query('DELETE FROM study_opens WHERE church_id=$1 AND publication_id=$2',[churchId,candidate.publication_id]);
    await client.query('DELETE FROM publication_audience_members WHERE church_id=$1 AND publication_id=$2',[churchId,candidate.publication_id]);
  }
  await client.query("DELETE FROM study_opens o WHERE o.church_id=$1 AND o.first_opened_at<$2::timestamptz-interval '90 days' AND NOT EXISTS(SELECT 1 FROM publication_audiences a WHERE a.church_id=o.church_id AND a.publication_id=o.publication_id)",[churchId,now]);
}
