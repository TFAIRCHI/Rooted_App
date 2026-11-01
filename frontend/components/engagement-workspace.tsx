"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Session } from "../lib/api";
import type { WorkspaceData } from "../lib/types";
import { Badge, Empty, Heading, Notice } from "./ui";
import { StudyLifecycleActions } from "./study-lifecycle-actions";

type StudyItem = { publicationId: string; contentId: string; studyId: string; slotEtag: string; withdrawn: boolean; historical: boolean; title: string; publishedAt: string; scheduledAt: { localDate: string; localTime: string; timeZone: string }; reactionCount: number; discussionCount: number };
type Comment = { id: string; authorId: string; authorName: string; body: string; status: string; kind: string; parentId: string | null; resolvedAt: string | null; etag: string; createdAt: string };
type Detail = { publication: { id: string; contentId: string; studyId: string; slotEtag: string; withdrawn: boolean; historical: boolean; payload: { title: string; body: string; reflection: string; discussionQuestion: string; application: string; references?: string[] }; publishedAt: string; scheduledAt: { localDate: string; localTime: string; timeZone: string } }; reactions: Record<string, number>; discussionTotals: Record<string, number>; delivery: { status: string; count: number }[]; canReadComments: boolean; uniqueOpens: number; uniqueAudienceOpens: number | null; audienceMemberCount: number | null; questionsNeedingAnswer: number };
type Filter = "all" | "unanswered" | "approved" | "pending" | "declined";

export function StudyEngagement({ data, session }: { data: WorkspaceData; session: Session }) {
  const allowed = session.churches.find(church => church.id === data.church.id)?.capabilities.includes("engagement:read");
  const [studies, setStudies] = useState<StudyItem[]>([]); const [selectedId, setSelectedId] = useState(""); const [detail, setDetail] = useState<Detail | null>(null);
  const [includeWithdrawn, setIncludeWithdrawn] = useState(false); const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all"); const [comments, setComments] = useState<Comment[]>([]); const [commentCursor, setCommentCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [writing, setWriting] = useState<Record<string, string>>({});
  const requestId = useRef(0); const prefix = `/churches/${data.church.id}`;
  const load = useCallback(async (cursor?: string) => {
    setBusy(true); setError("");
    try { const result = await api<{ items: StudyItem[]; nextCursor: string | null }>(`${prefix}/engagement/studies?includeWithdrawn=${includeWithdrawn}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`); setStudies(previous => cursor ? [...previous, ...result.data.items] : result.data.items); setNextCursor(result.data.nextCursor); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Study engagement could not be loaded."); } finally { setBusy(false); }
  }, [prefix, includeWithdrawn]);
  useEffect(() => { if (allowed) void load(); }, [allowed, load]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search); setSelectedId(params.get("publication") ?? "");
    const requested = params.get("filter"); if (["unanswered", "approved", "pending", "declined"].includes(requested ?? "")) setFilter(requested as Filter);
    setDetail(null); setComments([]);
  }, [data.church.id]);
  const openStudy = useCallback(async (id: string) => {
    const current = ++requestId.current; setError("");
    try { const result = await api<Detail>(`${prefix}/engagement/studies/${id}`); if (current === requestId.current) setDetail(result.data); }
    catch (failure) { if (current === requestId.current) setError(failure instanceof Error ? failure.message : "Study engagement could not be opened."); }
  }, [prefix]);
  useEffect(() => { if (allowed && selectedId) void openStudy(selectedId); return () => { requestId.current++; }; }, [allowed, selectedId, openStudy]);
  const loadComments = useCallback(async (cursor?: string) => {
    if (!selectedId || !detail?.canReadComments) return;
    try { const result = await api<{ items: Comment[]; nextCursor: string | null }>(`${prefix}/engagement/studies/${selectedId}/comments?filter=${filter}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`); setComments(previous => cursor ? [...previous, ...result.data.items] : result.data.items); setCommentCursor(result.data.nextCursor); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Comments could not be loaded."); }
  }, [prefix, selectedId, filter, detail?.canReadComments]);
  useEffect(() => { setComments([]); setCommentCursor(null); void loadComments(); }, [loadComments]);
  async function act(comment: Comment, action: "approve" | "hide" | "decline" | "reply" | "resolve" | "reopen") {
    setBusy(true); setError("");
    try {
      const text = writing[comment.id]?.trim();
      if (!text) throw new Error(action === "reply" ? "Write a reply first." : "Add a short reason before continuing.");
      const path = action === "reply" ? `/discussion/${comment.id}/replies` : ["resolve", "reopen"].includes(action) ? `/discussion/${comment.id}/resolution` : `/moderation/${comment.id}/decisions`;
      await api(prefix + path, { method: "POST", csrf: session.csrfToken, etag: comment.etag, body: action === "reply" ? { body: text } : { decision: action, reason: text } });
      setWriting(previous => ({ ...previous, [comment.id]: "" })); setMessage(action === "reply" ? "Reply posted. The question is marked answered." : "Conversation updated."); await Promise.all([openStudy(selectedId), loadComments(), load()]);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The action could not be completed."); await loadComments(); } finally { setBusy(false); }
  }
  if (!allowed) return <Empty title="Study Engagement is restricted">Your membership does not include engagement access.</Empty>;
  const publication = detail?.publication;
  return <>
    <Heading eyebrow={`${data.church.name} · Community care`} title="Study Engagement">Read each historical publication and care for the conversation around it.</Heading>
    {error && <Notice error>{error} <button onClick={() => void load()}>Retry engagement</button></Notice>}{message && <Notice>{message}</Notice>}
    <label className="check"><input type="checkbox" checked={includeWithdrawn} onChange={event => setIncludeWithdrawn(event.target.checked)} />Include withdrawn and historical publications</label>
    <div className="engagement-layout"><section className="card engagement-list"><div className="card-top"><h2>Shared studies</h2><Badge>{studies.length}</Badge></div>
      {studies.length ? studies.map(study => <button className={`engagement-study ${selectedId === study.publicationId ? "selected" : ""}`} key={study.publicationId} onClick={() => { setSelectedId(study.publicationId); setDetail(null); const url = new URL(window.location.href); url.searchParams.set("publication", study.publicationId); window.history.replaceState(null, "", url); }}><span><strong>{study.title}</strong><small>Published {new Date(study.publishedAt).toLocaleDateString()} · {study.withdrawn ? "Withdrawn · History retained" : study.historical ? "Historical snapshot" : "Visible to members"}</small></span><span className="engagement-counts"><small>♡ {study.reactionCount}</small></span></button>) : <p className="muted">{busy ? "Loading shared studies…" : "No matching publications. Use the history filter to find withdrawn studies."}</p>}
      {nextCursor && <button onClick={() => void load(nextCursor)} disabled={busy}>Load older studies</button>}
    </section>
    {!detail || !publication ? <Empty title={selectedId ? "Opening publication…" : "Choose a shared study"}>Select a study to read its exact published snapshot and member responses.</Empty> : <section className="engagement-detail">
      <article className="card member-preview"><div className="card-top"><p className="eyebrow">Published {new Date(publication.publishedAt).toLocaleString()}</p><Badge>{publication.withdrawn ? "Withdrawn · History retained" : publication.historical ? "Historical publication" : "Published snapshot"}</Badge></div>
        {publication.withdrawn && <Notice>This historical artifact is hidden from members. It remains stored until an administrator explicitly performs Hard Delete.</Notice>}
        <h1>{publication.payload.title}</h1><p className="reading-text">{publication.payload.body}</p><h2>A moment to reflect</h2><p className="reading-text">{publication.payload.reflection}</p><h2>Bring it into conversation</h2><p className="reading-text">{publication.payload.discussionQuestion}</p><h2>Put it into practice</h2><p className="reading-text">{publication.payload.application}</p>
        {publication.payload.references?.length ? <><h2>Scripture &amp; sources</h2><ul>{publication.payload.references.map(reference => <li key={reference}>{reference}</li>)}</ul></> : null}
        <StudyLifecycleActions data={data} session={session} studyId={publication.studyId} title={publication.payload.title} etag={publication.slotEtag} everPublished withdrawn={publication.withdrawn} publishedAt={publication.publishedAt} localDate={publication.scheduledAt.localDate} localTime={publication.scheduledAt.localTime} timeZone={publication.scheduledAt.timeZone} onRemoved={() => { setSelectedId(""); setDetail(null); setIncludeWithdrawn(true); }} refresh={async () => { await load(); }} />
      </article>
      <section className="card"><h2>Member response</h2><div className="engagement-metrics"><span>Unique opens <strong>{detail.uniqueAudienceOpens ?? detail.uniqueOpens}{detail.audienceMemberCount !== null ? ` / ${detail.audienceMemberCount}` : " · audience not recorded"}</strong></span>{Object.entries(detail.reactions).map(([type, count]) => <span key={type}>{type} <strong>{count}</strong></span>)}<span>Questions to answer <strong>{detail.questionsNeedingAnswer}</strong></span></div></section>
      <section className="card"><div className="card-top"><h2>Conversation</h2><Badge>{detail.discussionTotals.pending} pending · {detail.discussionTotals.declined} declined</Badge></div>
        {!detail.canReadComments ? <p className="muted">Comment text is restricted to church moderators.</p> : <><label htmlFor="conversation-filter">Show comments</label><select id="conversation-filter" value={filter} onChange={event => setFilter(event.target.value as Filter)}><option value="all">All comments</option><option value="unanswered">Questions to answer</option><option value="approved">Posted</option><option value="pending">Pending review</option><option value="declined">Declined</option></select>
          {comments.length ? comments.map(comment => <article className="comment" key={comment.id}><strong>{comment.authorName || comment.authorId}</strong><small>{comment.kind} · {comment.status}{comment.kind === "question" ? comment.resolvedAt ? " · Answered" : " · Unanswered" : ""}</small><p className="preserve-lines">{comment.body}</p>
            {!publication.withdrawn && !publication.historical && comment.status !== "erased" && <><label htmlFor={`reply-${comment.id}`}>{comment.kind === "question" && comment.status === "approved" ? "Reply or resolution reason" : "Moderation reason"}</label><textarea id={`reply-${comment.id}`} value={writing[comment.id] ?? ""} onChange={event => setWriting(previous => ({ ...previous, [comment.id]: event.target.value }))} maxLength={10000} /><div className="actions">
              {comment.kind === "question" && comment.status === "approved" ? <><button className="primary" disabled={busy || !writing[comment.id]?.trim()} onClick={() => void act(comment, "reply")}>Post reply</button><button disabled={busy || !writing[comment.id]?.trim()} onClick={() => void act(comment, comment.resolvedAt ? "reopen" : "resolve")}>{comment.resolvedAt ? "Reopen question" : "Mark resolved"}</button></> : <><button disabled={busy || !writing[comment.id]?.trim()} onClick={() => void act(comment, "approve")}>{comment.status === "declined" ? "Reverse decline and approve" : "Approve comment"}</button><button disabled={busy || !writing[comment.id]?.trim()} onClick={() => void act(comment, "decline")}>Decline comment</button></>}
              <button disabled={busy || !writing[comment.id]?.trim()} onClick={() => void act(comment, "hide")}>Hide comment</button>
            </div></>}
          </article>) : <p className="muted">No comments match this filter.</p>}{commentCursor && <button onClick={() => void loadComments(commentCursor)}>Load more comments</button>}
        </>}
      </section>
      <section className="card"><h2>Delivery context</h2><p className="fine">Planned {publication.scheduledAt.localDate} at {publication.scheduledAt.localTime} · {publication.scheduledAt.timeZone}</p>{detail.delivery.length ? detail.delivery.map(item => <p key={item.status}>{item.status.replaceAll("_", " ")} · {item.count}</p>) : <p className="muted">No external notification delivery evidence. Web publication is recorded separately.</p>}</section>
    </section>}
    </div>
  </>;
}
