"use client";
import { useState } from "react";
import Link from "next/link";
import { FlowStory, PublicFrame } from "./frame";

export function churchPath(input: string, origin: string): string | null {
  const text = input.trim();
  if (/^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/.test(text)) return `/c/${text}`;
  try { const url = new URL(text, origin); if (url.origin !== origin || url.search || url.hash || !/^\/c\/[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])\/?$/.test(url.pathname)) return null; return url.pathname.replace(/\/$/, ""); } catch { return null; }
}
export function FindChurch() {
  const [input, setInput] = useState(""); const [error, setError] = useState("");
  function submit(event: React.FormEvent) { event.preventDefault(); const path=churchPath(input,window.location.origin); if(!path) {setError("Use your church’s link on this Rooted site, or its church slug. For an invitation token, use Accept an invitation below."); return;} window.location.assign(path); }
  return <PublicFrame><main id="main" className="flow-layout"><FlowStory eyebrow="GROW WITH YOUR CHURCH" title={<>Your church.<br />A week you<br />can share.</>}><p>Use the link or invitation from your church to find the studies your team has prepared.</p></FlowStory><section className="form-card"><span className="eyebrow">YOU BELONG HERE</span><h2>Join your church.</h2><p>You don’t need to set up another church workspace.</p><form onSubmit={submit}><label className="field">Church link or slug<input value={input} onChange={event=>setInput(event.target.value)} placeholder="/c/your-church" required /><small>If you don’t have one yet, ask someone on your church team.</small></label>{error && <p className="public-error" role="alert">{error}</p>}<button className="primary">Open church link →</button></form><Link className="text-link" href="/sign-in?returnTo=%2Fonboarding%3Fintent%3Djoin">Accept an invitation →</Link><p className="fine-note">Invitations are accepted after sign-in and only by the person they were issued to.</p><Link className="text-link" href="/get-started">Helping lead a church? Get started →</Link></section></main></PublicFrame>;
}
