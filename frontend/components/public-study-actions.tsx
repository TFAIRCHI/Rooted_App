"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

type Comment = { id: string; authorName: string; nameVerified: false; body: string; kind: string; parentId: string | null; createdAt: string; mine?: boolean };
type Community = { discussionsEnabled: boolean; reactions: Record<string, number>; myReaction: string | null; comments: Comment[] };
const choices = [["like", "👍", "Like"], ["fire", "🔥", "Inspired"], ["praying", "🙏", "Praying"], ["thankful", "❤️", "Thankful"], ["encouraged", "🙌", "Encouraged"]] as const;

export function PublicStudyActions({ slug, publicationId }: { slug: string; publicationId: string }) {
  const path=`/public/churches/${encodeURIComponent(slug)}/studies/${encodeURIComponent(publicationId)}`;
  const [community,setCommunity]=useState<Community|null>(null);
  const [unavailable,setUnavailable]=useState(false);
  const [name,setName]=useState(""); const [body,setBody]=useState(""); const [kind,setKind]=useState<"response"|"question">("response");
  const [reportId,setReportId]=useState(""); const [reason,setReason]=useState("");
  const [message,setMessage]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  const load=useCallback(async()=>{
    try {const result=await api<Community>(`${path}/community`);setCommunity(result.data);setUnavailable(false);}
    catch {setUnavailable(true);}
  },[path]);
  useEffect(()=>{void load();},[load]);
  async function react(type:string){
    if(!community)return;
    setBusy(true);setError("");
    try {const selected=community.myReaction===type?null:type;await api(`${path}/reaction`,{method:"PUT",body:{type:selected}});setMessage(selected?"Reaction saved.":"Reaction removed.");await load();}
    catch(failure){setError(failure instanceof Error?failure.message:"Reaction could not be saved.");}
    finally{setBusy(false);}
  }
  if(unavailable)return null;
  return <section><h2>Join the conversation</h2><p className="muted">Read and react without signing in. A name is needed only if you leave a comment.</p>
    {community?<><div className="reaction-row">{choices.map(([type,emoji,label])=><button type="button" key={type} aria-label={`${label} · ${community.reactions[type]??0}`} aria-pressed={community.myReaction===type} disabled={busy} onClick={()=>void react(type)}><span aria-hidden="true">{emoji}</span> {label} <span>{community.reactions[type]??0}</span></button>)}</div>
      {community.discussionsEnabled?<><p className="member-policy">Comments are reviewed by your church before appearing. Names are provided by commenters and are not verified.</p><form onSubmit={async event=>{event.preventDefault();setBusy(true);setError("");try{await api(`${path}/comments`,{method:"POST",body:{displayName:name,body,kind}});setMessage("Your comment was submitted for church review.");setBody("");}catch(failure){setError(failure instanceof Error?failure.message:"Comment could not be submitted.");}finally{setBusy(false);}}}><label htmlFor="public-comment-name">Your name</label><input id="public-comment-name" value={name} maxLength={120} onChange={event=>setName(event.target.value)} required /><label htmlFor="public-comment-kind">Comment type</label><select id="public-comment-kind" value={kind} onChange={event=>setKind(event.target.value as "response"|"question")}><option value="response">Response</option><option value="question">Question for the church</option></select><label htmlFor="public-comment-body">Your comment</label><textarea id="public-comment-body" value={body} maxLength={5000} onChange={event=>setBody(event.target.value)} required /><button className="primary" disabled={busy||!name.trim()||!body.trim()}>{busy?"Submitting…":"Submit for review"}</button></form></>:<p>Comments are closed for this church.</p>}
      {community.comments.map(comment=><article className="comment" key={comment.id}><strong>{comment.authorName}</strong><small>{comment.kind==="reply"?"Church contributor reply":"Name provided by commenter · not verified"} · {new Date(comment.createdAt).toLocaleString()}</small><p className="preserve-lines">{comment.body}</p>{comment.mine?<button type="button" className="text-button" disabled={busy} onClick={async()=>{setBusy(true);setError("");try{await api(`${path}/comments/${comment.id}/remove`,{method:"POST",body:{}});setMessage("Your comment was removed.");await load();}catch(failure){setError(failure instanceof Error?failure.message:"Comment could not be removed.");}finally{setBusy(false);}}}>Remove my comment</button>:null}<button type="button" className="text-button" onClick={()=>{setReportId(comment.id);setReason("");}}>Report concern</button></article>)}
      {reportId?<form onSubmit={async event=>{event.preventDefault();setBusy(true);setError("");try{await api(`${path}/reports`,{method:"POST",body:{commentId:reportId,reason}});setMessage("Your report was sent to church moderators.");setReportId("");setReason("");}catch(failure){setError(failure instanceof Error?failure.message:"Report could not be sent.");}finally{setBusy(false);}}}><label htmlFor="public-report-reason">Reason for reporting</label><textarea id="public-report-reason" value={reason} maxLength={1000} onChange={event=>setReason(event.target.value)} required /><button className="primary" disabled={busy||!reason.trim()}>Send report</button><button type="button" onClick={()=>setReportId("")}>Cancel</button></form>:null}
    </>:<p role="status">Loading reactions and comments…</p>}{message?<p role="status">{message}</p>:null}{error?<p role="alert">{error}</p>:null}
  </section>;
}
