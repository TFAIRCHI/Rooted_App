"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Session } from "../lib/api";

type Item={id:string;authorName:string;body:string;kind:string;status:string;createdAt:string};
type Report={id:string;discussion_id:string;reason:string;created_at:string};
export function PublicModerationInbox({churchId,session}:{churchId:string;session:Session}){
  const [items,setItems]=useState<Item[]>([]);const [reports,setReports]=useState<Report[]>([]);const [reason,setReason]=useState<Record<string,string>>({});const [reply,setReply]=useState<Record<string,string>>({});const [error,setError]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
  const path=`/churches/${churchId}/public-moderation`;
  const load=useCallback(async()=>{try{const result=await api<{items:Item[];reports:Report[]}>(path);setItems(result.data.items);setReports(result.data.reports);}catch(failure){setError(failure instanceof Error?failure.message:"Could not load public comments.");}},[path]);
  useEffect(()=>{void load();},[load]);
  async function decide(id:string,decision:"approve"|"hide"|"decline"){
    setBusy(true);setError("");try{await api(`${path}/${id}/decision`,{method:"POST",csrf:session.csrfToken,body:{decision,reason:reason[id]}});setMessage(`Comment ${decision}.`);await load();}catch(failure){setError(failure instanceof Error?failure.message:"Decision failed.");}finally{setBusy(false);}
  }
  async function respond(id:string){setBusy(true);setError("");try{await api(`${path}/${id}/reply`,{method:"POST",csrf:session.csrfToken,body:{body:reply[id]}});setMessage("Church reply posted.");setReply({...reply,[id]:""});await load();}catch(failure){setError(failure instanceof Error?failure.message:"Reply failed.");}finally{setBusy(false);}}
  return <section className="card"><h2>Public comments awaiting review</h2><p>Names are supplied by visitors and are not verified. Older member discussions remain in the separate legacy queue above.</p>{items.length?items.map(item=><article className="comment" key={item.id}><strong>{item.authorName}</strong><small>{item.kind} · {new Date(item.createdAt).toLocaleString()}</small><p className="preserve-lines">{item.body}</p><label htmlFor={`public-decision-${item.id}`}>Reason for decision</label><textarea id={`public-decision-${item.id}`} value={reason[item.id]??""} onChange={event=>setReason({...reason,[item.id]:event.target.value})} /><div className="actions"><button disabled={busy||!reason[item.id]?.trim()} onClick={()=>void decide(item.id,"approve")}>Approve</button><button disabled={busy||!reason[item.id]?.trim()} onClick={()=>void decide(item.id,"hide")}>Hide</button><button disabled={busy||!reason[item.id]?.trim()} onClick={()=>void decide(item.id,"decline")}>Decline</button></div>{item.kind==="question"&&item.status==="approved"?<><label htmlFor={`public-reply-${item.id}`}>Church reply</label><textarea id={`public-reply-${item.id}`} value={reply[item.id]??""} onChange={event=>setReply({...reply,[item.id]:event.target.value})} /><button disabled={busy||!reply[item.id]?.trim()} onClick={()=>void respond(item.id)}>Post reply</button></>:null}</article>):<p>No public comments are waiting.</p>}{reports.length?<div><h3>Visitor reports</h3>{reports.map(report=><p key={report.id}>{report.reason} · comment {report.discussion_id}</p>)}</div>:null}{message?<p role="status">{message}</p>:null}{error?<p role="alert">{error}</p>:null}</section>;
}
