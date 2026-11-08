"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Session } from "../lib/api";

type Access = { reading_policy: string; public_read_enabled: boolean; public_engagement_enabled: boolean; study_sms_enabled: boolean; public_reviewed_at: string | null; sms_activated_at: string | null };
export function PublicAccessSettings({churchId,session,onChanged}:{churchId:string;session:Session;onChanged?:()=>void}) {
  const [access,setAccess]=useState<Access|null>(null); const [evidence,setEvidence]=useState("");
  const [message,setMessage]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  const path=`/churches/${churchId}/public-access`;
  const load=useCallback(async()=>{try{setAccess((await api<Access>(path)).data);}catch(failure){setError(failure instanceof Error?failure.message:"Could not load public access settings.");}},[path]);
  useEffect(()=>{void load();},[load]);
  async function act(action:"enable_read"|"enable_engagement"|"enable_sms"|"disable_read"|"disable_engagement"|"disable_sms"){
    setBusy(true);setError("");setMessage("");
    try{await api(path,{method:"POST",csrf:session.csrfToken,body:{action,...(action==="enable_read"||action==="enable_sms"?{evidence}: {})}});setMessage("Public access setting saved.");setEvidence("");await load();onChanged?.();}
    catch(failure){setError(failure instanceof Error?failure.message:"Could not save public access setting.");}finally{setBusy(false);}
  }
  return <section className="card"><h2>Public study access</h2><p>Review every live study before allowing anyone with its link to read it. Older member comments stay private.</p>{access?<><p>Reading: {access.reading_policy==="public"?"public":"members only"} · Guest participation: {access.public_engagement_enabled?"on":"off"} · Study SMS: {access.study_sms_enabled?"on":"off"}</p><label htmlFor="public-access-evidence">Review or sender/consent evidence reference</label><textarea id="public-access-evidence" value={evidence} onChange={event=>setEvidence(event.target.value)} maxLength={1000} /><div className="actions">{!access.public_read_enabled?<button type="button" disabled={busy||evidence.trim().length<10} onClick={()=>void act("enable_read")}>Confirm review & enable public studies</button>:null}{access.public_read_enabled&&!access.public_engagement_enabled?<button type="button" disabled={busy} onClick={()=>void act("enable_engagement")}>Enable guest reactions & comments</button>:null}{access.public_engagement_enabled?<button type="button" disabled={busy} onClick={()=>void act("disable_engagement")}>Pause guest participation</button>:null}{access.public_read_enabled&&!access.study_sms_enabled?<button type="button" disabled={busy||evidence.trim().length<10} onClick={()=>void act("enable_sms")}>Enable registered study SMS sender</button>:null}{access.study_sms_enabled?<button type="button" disabled={busy} onClick={()=>void act("disable_sms")}>Pause study SMS</button>:null}{access.reading_policy==="public"?<button type="button" disabled={busy} onClick={()=>void act("disable_read")}>Pause public reading and delivery</button>:null}</div></>:<p role="status">Loading public access…</p>}{message?<p role="status">{message}</p>:null}{error?<p role="alert">{error}</p>:null}</section>;
}
