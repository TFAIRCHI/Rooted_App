"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Session } from "../../lib/api";
import { PublicFrame } from "./frame";

export function ChooseChurch() {
  const [session,setSession]=useState<Session|null>(null), [error,setError]=useState("");
  useEffect(()=>{void api<Session>("/auth/session").then(({data})=>setSession(data)).catch(()=>setError("Sign in to choose a church workspace."));},[]);
  return <PublicFrame><main id="main" className="flow-layout"><section className="flow-story"><p className="eyebrow">YOUR CHURCH TEAM</p><h1>Choose your church.</h1><p>Each church has its own workspace and access.</p></section><section className="form-card"><h2>Your workspaces</h2>{error&&<p className="public-error" role="alert">{error} <Link href="/sign-in">Team sign in →</Link></p>}{!session&&!error&&<p role="status">Loading your churches…</p>}{session?.churches.filter(church=>church.contributorAccess??church.capabilities.includes("workspace:read")).map(church=><p key={church.id}><Link className="button public-wide" href={`/dashboard?church=${church.id}`}>{church.name} →</Link></p>)}{session&&!session.churches.length&&<p>No church workspace is connected to this account. Ask your church administrator for an invitation.</p>}</section></main></PublicFrame>;
}
