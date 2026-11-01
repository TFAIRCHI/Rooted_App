"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api, type Session } from "../lib/api";
import { Notice } from "./ui";

type Comment = { id: string; authorId: string; authorName: string; body: string; status: string; kind: string; parentId: string | null; resolvedAt: string | null; etag: string; createdAt: string };
type Community = { discussionsEnabled: boolean; reactions: Record<string, number>; myReaction: string | null; comments: Comment[] };

export function MemberActions({ publicationId, churchId, session: signedInSession, slug }: { publicationId: string; churchId: string; session: Session | null; slug: string }) {
  const session = signedInSession?.churches.some(church => church.id === churchId) ? signedInSession : null;
  const [reaction, setReaction] = useState<string | null>(null);
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [community, setCommunity] = useState<Community | null>(null); const [body, setBody] = useState("");
  const [kind, setKind] = useState<"response" | "question">("response"); const [editing, setEditing] = useState<Comment | null>(null);
  const [reportId, setReportId] = useState(""); const [reportReason, setReportReason] = useState("");
  const generation = useRef(0); const prefix = `/churches/${churchId}/studies/${publicationId}`;
  const load = useCallback(async () => {
    if (!session) return; const request = ++generation.current;
    try { const result = await api<Community>(prefix + "/community"); if (request === generation.current) { setCommunity(result.data); setReaction(result.data.myReaction); } }
    catch (failure) { if (request === generation.current) setError(failure instanceof Error ? failure.message : "Conversation could not be loaded."); }
  }, [prefix, session]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  useEffect(() => {
    if (!session) return; let recorded = false; let disposed = false;
    async function recordOpen() {
      if (recorded || disposed || document.visibilityState !== "visible") return; recorded = true;
      try { await api(prefix + "/open", { method: "POST", csrf: session?.csrfToken, body: {} }); } catch { recorded = false; }
    }
    void recordOpen(); document.addEventListener("visibilitychange", recordOpen);
    return () => { disposed = true; document.removeEventListener("visibilitychange", recordOpen); };
  }, [prefix, session]);
  async function react(type: string) {
    setBusy(true); setError("");
    try { const selected = reaction === type ? null : type; await api(prefix + "/my-reaction", { method: "PUT", csrf: session?.csrfToken, body: { type: selected } }); setReaction(selected); setMessage(selected ? "Your appreciation was saved." : "Your appreciation was removed."); await load(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Reaction could not be saved."); } finally { setBusy(false); }
  }
  function renderComment(comment: Comment) {
    return <article className={`comment ${comment.parentId ? "comment-reply" : ""}`} key={comment.id}><strong>{comment.authorName || comment.authorId}</strong><small>{new Date(comment.createdAt).toLocaleString()} · {comment.kind === "question" ? comment.resolvedAt ? "Question · Answered" : "Question" : comment.kind === "reply" ? "Church contributor reply" : "Response"} · {comment.status === "pending" ? "Pending review" : comment.status === "declined" ? "Declined · Private to you and church moderators" : comment.status}</small><p className="preserve-lines">{comment.body}</p>{comment.status === "declined" && <p className="fine">Please rephrase respectfully, or contact your church if you think this was a mistake.</p>}<div className="actions">{comment.authorId === session?.user.id && !comment.parentId && !["erased", "hidden"].includes(comment.status) && <button className="text-button" onClick={() => { setEditing(comment); setBody(comment.body); setKind(comment.kind === "question" ? "question" : "response"); document.getElementById("member-discussion")?.focus(); }}>Revise comment</button>}{["approved", "hidden"].includes(comment.status) && <button className="text-button" aria-label={`Report comment by ${comment.authorName || comment.authorId}`} onClick={() => { setReportId(comment.id); setReportReason(""); }}>Report concern</button>}</div></article>;
  }
  return <section><h2>Join the conversation</h2>{session ? <>
    <p className="muted">Share a little encouragement with your church.</p><div className="reaction-row">{[["like", "👍", "Like"], ["fire", "🔥", "Inspired"], ["praying", "🙏", "Praying"], ["thankful", "❤️", "Thankful"], ["encouraged", "🙌", "Encouraged"]].map(([type, emoji, label]) => <button type="button" key={type} aria-label={`${label} · ${community?.reactions[type] ?? 0}`} aria-pressed={reaction === type} disabled={busy} onClick={() => void react(type)}><span aria-hidden="true">{emoji}</span> {label} <span>{community?.reactions[type] ?? 0}</span></button>)}</div>
    {message && <Notice><span role="status">{message}</span></Notice>}{error && <Notice error>{error} <button onClick={() => void load()}>Retry conversation</button></Notice>}
    {!community ? <p className="fine" role="status">Checking discussion policy…</p> : <>
      {community.discussionsEnabled ? <><div className="member-policy">Share encouragement, a question about Scripture, or a practical takeaway. Negative comments that attack or demean others are automatically declined. Honest questions and prayer requests are welcome.</div><details><summary>What can I share?</summary><ul><li>How can I apply this at work?</li><li>This reminded me to pray for my family.</li><li>Could you explain what this verse means?</li></ul><p className="fine">Automatic screening catches clear attacks. Your church reviews other comments before they appear. Avoid sharing someone else’s private information.</p></details>
        <form onSubmit={async event => {
          event.preventDefault(); setBusy(true); setError("");
          try { const result = await api<Comment>(editing ? `/churches/${churchId}/discussion/${editing.id}/revisions` : prefix + "/discussion", { method: "POST", csrf: session.csrfToken, etag: editing?.etag, body: { body, kind } }); setMessage(result.data.status === "declined" ? "Your comment was declined. You can revise it or contact your church." : "Your comment is private while your church reviews it."); setBody(""); setEditing(null); await load(); }
          catch (failure) { setError(failure instanceof Error ? failure.message : "Comment was not submitted. Your writing has been kept."); } finally { setBusy(false); }
        }}><fieldset><legend className="sr-only">Comment type</legend><div className="actions"><label className="check"><input type="radio" name="comment-kind" checked={kind === "response"} onChange={() => setKind("response")} />Response</label><label className="check"><input type="radio" name="comment-kind" checked={kind === "question"} onChange={() => setKind("question")} />Question</label></div></fieldset><label htmlFor="member-discussion">{editing ? "Revise your comment" : "Your comment"}</label><textarea id="member-discussion" value={body} onChange={event => setBody(event.target.value)} required maxLength={10000} /><p className="fine">Comments stay private until approved. Clear attacks are automatically declined; uncertain cases receive human review.</p><div className="actions"><button className="primary" disabled={busy || !body.trim()}>{busy ? "Submitting…" : editing ? "Submit revision" : "Submit comment"}</button>{editing && <button type="button" onClick={() => { setEditing(null); setBody(""); }}>Cancel revision</button>}</div></form>
      </> : <p className="member-policy">Discussion is off for this church. Appreciation reactions remain available. Ask your church team about enabling moderated comments.</p>}
      {community.comments.filter(comment => !comment.parentId).map(comment => <div key={comment.id}>{renderComment(comment)}{community.comments.filter(reply => reply.parentId === comment.id).map(renderComment)}</div>)}
      {reportId && <form className="card" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(""); try { await api(prefix + "/reports", { method: "POST", csrf: session.csrfToken, body: { commentId: reportId, reason: reportReason } }); setReportId(""); setReportReason(""); setMessage("Your private report was sent to church moderators."); } catch (failure) { setError(failure instanceof Error ? failure.message : "Report was not submitted."); } finally { setBusy(false); } }}><label htmlFor="report-reason">Why are you reporting this comment?</label><textarea id="report-reason" value={reportReason} onChange={event => setReportReason(event.target.value)} required maxLength={5000} /><div className="actions"><button className="primary" disabled={busy || !reportReason.trim()}>Submit private report</button><button type="button" onClick={() => setReportId("")}>Cancel report</button></div></form>}
    </>}
  </> : <><p className="muted">{signedInSession ? "Participation requires membership in this church. Ask your church team for an invitation." : "Sign in to share appreciation and join your church’s conversation."}</p><a className="button" href={signedInSession ? "/onboarding?intent=join" : `/sign-in?returnTo=${encodeURIComponent(`/c/${slug}/studies/${publicationId}`)}`}>{signedInSession ? "Accept a church invitation" : "Sign in to participate"}</a></>}</section>;
}
