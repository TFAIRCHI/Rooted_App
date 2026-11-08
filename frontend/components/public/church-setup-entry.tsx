"use client";

import Link from "next/link";
import { PublicFrame } from "./frame";

export function ChurchSetupEntry({ name, slug, zone, authority, error, verifying, onName, onSlug, onZone, onAuthority, onContinue }: {
  name: string;
  slug: string;
  zone: string;
  authority: boolean;
  error: string;
  verifying: boolean;
  onName: (value: string) => void;
  onSlug: (value: string) => void;
  onZone: (value: string) => void;
  onAuthority: (value: boolean) => void;
  onContinue: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return <PublicFrame><main id="main" className="flow-layout">
    <section className="flow-story">
      <Link className="back-link" href="/get-started">← Back to getting started</Link>
      <span className="eyebrow">START YOUR CHURCH SPACE</span>
      <h1>Your church.<br />A place to grow.</h1>
      <p>Start with your church’s details. Next, create or sign in to your church team account. You’ll return here to confirm the workspace and begin planning studies.</p>
      <div className="mini-trail"><span>1</span> Your church <i /><span>2</span> Account <i /><span>3</span> Begin</div>
    </section>
    <section className="form-card">
      <span className="eyebrow">STEP 1 · YOUR CHURCH</span>
      <h2>Set up your church.</h2>
      <p>These details will become your church’s Rooted workspace and public study link.</p>
      {verifying && <p className="fine-note">Verify your account to continue as a church leader.</p>}
      {error && <p className="public-error" role="alert">{error}</p>}
      <form onSubmit={onContinue}>
        <label className="field">Church name<input value={name} onChange={event => onName(event.target.value)} maxLength={300} autoComplete="organization" required /></label>
        <label className="field">Your church link<input value={slug} onChange={event => onSlug(event.target.value)} pattern="[a-z0-9](?:[a-z0-9\-]{1,58}[a-z0-9])" required /><small>Members will use: /c/{slug || "your-church"}</small></label>
        <label className="field">Church IANA timezone<input value={zone} onChange={event => onZone(event.target.value)} required maxLength={100} /><small>Confirm the timezone for your church’s local week.</small></label>
        <label className="check-field"><input type="checkbox" checked={authority} onChange={event => onAuthority(event.target.checked)} required /><span>I’m authorized to create a Rooted workspace for this church.</span></label>
        <button className="primary" disabled={!authority}>{verifying ? "Verify account and continue →" : "Continue to account setup →"}</button>
      </form>
      <p className="fine-note">Your church space is created only after you return and confirm these details.</p>
    </section>
  </main></PublicFrame>;
}
