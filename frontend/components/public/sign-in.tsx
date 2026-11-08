"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, type Session } from "../../lib/api";
import { FlowStory, PublicFrame } from "./frame";

export function PublicSignIn({ returnTo }: { returnTo?: string }) {
  const settingUpChurch = returnTo === "/onboarding?intent=create-church";
  const [options, setOptions] = useState<{localIssuer: boolean; demoLogin: boolean} | null>(null);
  const [error, setError] = useState(""); const [retry, setRetry] = useState(0);
  const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false);
  const [persona, setPersona] = useState("morgan.admin");
  useEffect(() => {
    let active = true;
    void api<{localIssuer: boolean; demoLogin: boolean}>("/auth/options").then(result => { if (active) setOptions(result.data); }).catch(() => { if (active) setError("Sign-in is unavailable. Try connecting again."); });
    void api<Session>("/auth/session").then(({data}) => {
      if (!active || data.access === "member") return;
      window.location.replace(returnTo ?? (data.churches.length ? (data.churches[0].capabilities.includes("workspace:read") ? "/dashboard" : `/c/${data.churches[0].slug}`) : "/onboarding?intent=join"));
    }).catch(failure => { if (active && !(failure instanceof ApiError && failure.status === 401)) setError("Could not check your session. You can retry the connection."); });
    return () => { active = false; };
  }, [returnTo, retry]);
  const params = new URLSearchParams({access:"contributor"});
  if (returnTo) params.set("returnTo", returnTo);
  if (options?.localIssuer) params.set("persona",persona);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const {data} = await api<{redirectTo:string}>("/auth/demo-login",{method:"POST",body:{username,password, ...(returnTo ? {returnTo} : {})}});
      window.location.assign(data.redirectTo);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Sign-in failed."); }
    finally { setBusy(false); }
  }
  return <PublicFrame><main id="main" className="flow-layout">
    <FlowStory eyebrow={settingUpChurch ? "STEP 2 · YOUR ACCOUNT" : "A SHARED DIRECTION"} title={settingUpChurch ? <>Your church.<br />Your next step.</> : <>A little time.<br />Room to grow.</>}><p>{settingUpChurch ? "Create or sign in to your church team account. After verification, your church details will be ready for you to confirm." : "Church teams can sign in to work on studies. To read, open the link your church shared with you."}</p></FlowStory>
    <section className="form-card">
      <span className="eyebrow">WELCOME TO ROOTED</span>
      <h2>{settingUpChurch ? "Continue church setup." : "Your church workspace."}</h2>
      <p>{settingUpChurch ? "Create or sign in to your church team account. You’ll return to confirm your church’s workspace before it is created." : "Sign in as a contributor or administrator to work on your church’s studies. Members can read studies through a church link without signing in."}</p>
      {error && <div className="public-error" role="alert">{error} <button type="button" onClick={() => { setError(""); setRetry(retry + 1); }}>Retry connection</button></div>}
      {options?.localIssuer && <label className="field">Local development identity<select value={persona} onChange={event=>setPersona(event.target.value)}><option value="morgan.admin">Morgan · church administrator</option><option value="anna.contributor">Anna · contributor</option><option value="james.contributor">James · contributor</option></select><small>Fictional identities for this local demo. Production uses your configured provider.</small></label>}
      <a className="button public-wide" aria-disabled={!options} href={options ? `/api/v1/auth/login?${params}` : undefined}>{settingUpChurch ? "Create account or sign in →" : "Contributor or administrator sign in →"}</a>
      <Link className="button secondary public-wide" href="/find-church">Use a church link or invitation →</Link>
      {options?.demoLogin && <details className="local-sign-in"><summary>Local demo username and password</summary><form onSubmit={submit}><label className="field">Username or email<input autoComplete="username" required value={username} onChange={event=>setUsername(event.target.value)} /></label><label className="field">Password<input type="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)} /></label><button className="primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></form></details>}
      <p className="fine-note">Your church assigns workspace permissions. Verifying your account does not grant a church role.</p>
    </section>
  </main></PublicFrame>;
}
