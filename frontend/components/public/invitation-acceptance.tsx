"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, type Session } from "../../lib/api";
import { PublicFrame } from "./frame";

type Preview = { churchName: string; firstName: string; lastName: string; role: string; expiresAt: string };
const storageKey = "rooted:email-invitation";

export function InvitationAcceptance() {
  const [token,setToken] = useState("");
  const [preview,setPreview] = useState<Preview | null>(null);
  const [session,setSession] = useState<Session | null>(null);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const [needsVerification,setNeedsVerification] = useState(false);
  const [verificationCode,setVerificationCode] = useState("");
  const [localIssuer,setLocalIssuer] = useState(false);
  const [persona,setPersona] = useState("riley.member");
  useEffect(()=>{
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const incoming = fragment.get("token");
    if (incoming) { sessionStorage.setItem(storageKey,incoming); window.history.replaceState(null,"",window.location.pathname); }
    const value = incoming ?? sessionStorage.getItem(storageKey) ?? "";
    if (!value) { setError("This invitation link is missing. Open the link in your email again."); return; }
    setToken(value);
    void api<Preview>("/email-invitations/preview",{method:"POST",body:{token:value}}).then(({data})=>setPreview(data)).catch(()=>setError("This invitation has expired or is no longer available."));
    void api<Session>("/auth/session").then(({data})=>setSession(data)).catch(failure=>{if (!(failure instanceof ApiError && failure.status===401)) setError("Could not check your sign-in. Try again.");});
    void api<{localIssuer:boolean}>("/auth/options").then(({data})=>setLocalIssuer(data.localIssuer)).catch(()=>undefined);
  },[]);
  async function accept() {
    if (!session || !token) return;
    setBusy(true); setError("");
    try {
      const {data}=await api<{churchId:string}>("/email-invitations/accept",{method:"POST",csrf:session.csrfToken,body:{token,...(verificationCode?{code:verificationCode}:{})}});
      sessionStorage.removeItem(storageKey);
      window.location.assign(`/dashboard?church=${encodeURIComponent(data.churchId)}`);
    } catch(failure) {
      if (failure instanceof ApiError && failure.code==="mfa_required") { window.location.assign("/api/v1/auth/login?access=contributor&returnTo=%2Finvitation"); return; }
      if (failure instanceof ApiError && failure.code==="email_verification_required") {setNeedsVerification(true);setError("Verify the invited email address to continue.");return;}
      setError(failure instanceof Error ? failure.message : "Could not accept this invitation.");
    } finally {setBusy(false);}
  }
  async function requestCode() {
    if (!session) return;
    setBusy(true);setError("");
    try {await api("/email-invitations/verify-email",{method:"POST",csrf:session.csrfToken,body:{token}});setError("A verification code was sent to the invited email address.");}
    catch(failure) {setError(failure instanceof Error?failure.message:"Verification email could not be sent.");}
    finally {setBusy(false);}
  }
  return <PublicFrame><main id="main" className="flow-layout"><section className="flow-story"><p className="eyebrow">CHURCH TEAM INVITATION</p><h1>Make room to work together.</h1><p>Sign in with the email address this invitation was sent to. Rooted will connect your verified account to the church shown here.</p></section><section className="form-card"><h2>{preview ? `Join ${preview.churchName}` : "Your invitation"}</h2>{preview ? <><p>{preview.firstName} {preview.lastName}, you have been invited as a <strong>{preview.role}</strong>.</p><p className="fine-note">Expires {new Date(preview.expiresAt).toLocaleDateString()}.</p></> : !error ? <p role="status">Checking invitation…</p> : null}{error && <p className="public-error" role="alert">{error}</p>}{preview && !session && <>{localIssuer&&<label className="field">Local development identity<select value={persona} onChange={event=>setPersona(event.target.value)}><option value="riley.member">Riley · member</option><option value="anna.contributor">Anna · contributor</option><option value="james.contributor">James · contributor</option></select></label>}<a className="button public-wide" href={`/api/v1/auth/login?access=contributor&returnTo=%2Finvitation${localIssuer?`&persona=${encodeURIComponent(persona)}`:""}`}>Sign in or create your account →</a></>}{preview && session && <><p>Signed in as {session.user.displayName}.</p>{needsVerification&&<><button type="button" disabled={busy} onClick={()=>void requestCode()}>Email me a verification code</button><label className="field">Verification code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} value={verificationCode} onChange={event=>setVerificationCode(event.target.value)}/></label></>}<button className="primary public-wide" disabled={busy || needsVerification && verificationCode.length!==8} onClick={()=>void accept()}>{busy ? "Joining…" : `Join ${preview.churchName}`}</button><p className="fine-note">This must be the account for the invited email address. If it is not, sign out and return to this page.</p></>}<Link className="text-link" href="/sign-in">Team sign in →</Link></section></main></PublicFrame>;
}
