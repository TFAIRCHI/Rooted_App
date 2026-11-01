"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, type Session } from "../../lib/api";
import { loginAccess } from "../../lib/sign-in";
import { FlowStory, PublicFrame } from "./frame";

export function PublicSignIn({ returnTo, access }: { returnTo?: string; access?: "member" | "contributor" }) {
  const mode = access ?? loginAccess(returnTo);
  const [options, setOptions] = useState<{localIssuer: boolean; demoLogin: boolean} | null>(null);
  const [error, setError] = useState(""); const [retry, setRetry] = useState(0);
  const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false);
  const [persona, setPersona] = useState("morgan.admin");
  useEffect(() => {
    let active = true;
    void api<{localIssuer: boolean; demoLogin: boolean}>("/auth/options").then(result => { if (active) setOptions(result.data); }).catch(() => { if (active) setError("Sign-in is unavailable. Try connecting again."); });
    void api<Session>("/auth/session").then(({data}) => {
      if (!active || (mode === "contributor" && data.access === "member")) return;
      window.location.replace(returnTo ?? (data.churches.length ? (data.churches[0].capabilities.includes("workspace:read") ? "/dashboard" : `/c/${data.churches[0].slug}`) : "/onboarding?intent=join"));
    }).catch(failure => { if (active && !(failure instanceof ApiError && failure.status === 401)) setError("Could not check your session. You can retry the connection."); });
    return () => { active = false; };
  }, [returnTo, retry, mode]);
  const params = new URLSearchParams({access:mode});
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
    <FlowStory eyebrow="A SHARED DIRECTION" title={<>A little time.<br />Room to grow.</>}><p>Sign in to your church’s space, or take the first step toward a shared rhythm in Scripture.</p></FlowStory>
    <section className="form-card">
      <span className="eyebrow">WELCOME TO ROOTED</span>
      <h2>{mode === "contributor" ? "Your church workspace." : "Welcome back."}</h2>
      <p>{mode === "contributor" ? "Verify your contributor or administrator access to work on your church’s studies. Reading access stays separate." : "Use your email to sign in and read your church’s studies. You’ll stay signed in on this browser until you sign out."}</p>
      {error && <div className="public-error" role="alert">{error} <button type="button" onClick={() => { setError(""); setRetry(retry + 1); }}>Retry connection</button></div>}
      {options?.localIssuer && <label className="field">Local development identity<select value={persona} onChange={event=>setPersona(event.target.value)}><option value="morgan.admin">Morgan · church administrator</option><option value="anna.contributor">Anna · contributor</option><option value="james.contributor">James · contributor</option><option value="riley.member">Riley · member</option></select><small>Fictional identities for this local demo. Production uses your configured provider.</small></label>}
      <a className="button public-wide" aria-disabled={!options} href={options ? `/api/v1/auth/login?${params}` : undefined}>{mode === "contributor" ? "Verify contributor access →" : "Member sign in →"}</a>
      {mode === "member" ? <Link className="text-link" href="/sign-in?access=contributor&returnTo=%2Fdashboard">Contributor or administrator sign in →</Link> : <Link className="text-link" href="/sign-in">Just here to read? Member sign in →</Link>}
      {options?.demoLogin && <details className="local-sign-in"><summary>Local demo username and password</summary><form onSubmit={submit}><label className="field">Username or email<input autoComplete="username" required value={username} onChange={event=>setUsername(event.target.value)} /></label><label className="field">Password<input type="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)} /></label><button className="primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></form></details>}
      <p className="fine-note">{mode === "member" ? "On a shared device, sign out when you finish. Clearing browser data also removes your sign-in." : "Your church assigns workspace permissions. Verifying your account does not grant a church role."}</p>
      <Link className="text-link" href="/find-church">Use a church link or invitation →</Link>
    </section>
  </main></PublicFrame>;
}
