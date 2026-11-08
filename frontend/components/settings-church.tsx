"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Church, type Session } from "../lib/api";
import type { WorkspaceData } from "../lib/types";
import { Notice } from "./ui";

type PrivacyRequest = { id: string; kind: string; status: string; createdAt: string };

export function SettingsChurch({ data, session, refresh }: { data: WorkspaceData; session: Session; refresh: () => Promise<void> }) {
  const churchId = data.church.id;
  const caps = session.churches.find(item => item.id === churchId)?.capabilities ?? [];
  const canManage = caps.includes("settings:manage");
  const canTheme = caps.includes("theme:manage") || canManage;
  const [name, setName] = useState(data.church.name);
  const [zone, setZone] = useState(data.church.timeZone ?? "");
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const edited = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);
  const load = useCallback(async () => {
    try {
      const [church, privacy] = await Promise.all([
        api<Church>(`/churches/${churchId}/settings`),
        api<{ items: PrivacyRequest[] }>(`/churches/${churchId}/privacy/requests`),
      ]);
      if (!edited.current) { setName(church.data.name); setZone(church.data.timeZone ?? ""); }
      setRequests(privacy.data.items);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Church settings could not be loaded."); }
    finally { setLoading(false); }
  }, [churchId]);
  useEffect(() => { void load(); }, [load]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      await api(`/churches/${churchId}/settings`, { method: "POST", csrf: session.csrfToken, body: { name: name.trim(), timeZone: zone.trim() } });
      setMessage("Church identity and timezone saved."); await refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Church settings could not be saved."); }
    finally { setBusy(false); }
  }
  async function request(kind: "export" | "erasure") {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await api<{ message: string }>(`/churches/${churchId}/privacy/requests`, { method: "POST", csrf: session.csrfToken, body: { kind } });
      setMessage(result.data.message); setConfirmErase(false); await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Request could not be recorded."); }
    finally { setBusy(false); }
  }
  const swatches = [data.church.theme?.tokens?.navSurface ?? "#1b3234", data.church.theme?.primary ?? "#176e61", data.church.theme?.accent ?? "#d5dfd7", data.church.theme?.surface ?? "#f5f4ef"];
  return <div className="settings-page"><header className="settings-heading"><div><p className="eyebrow">Workspace settings</p><h1>A workspace shaped by your church.</h1><p className="muted">Keep your church identity, local time and workspace appearance in one place.</p></div>{canManage && <button className="primary" type="submit" form="settings-church-form" disabled={loading || busy || !name.trim() || !zone.trim()}>{busy ? "Saving…" : "Save changes"}</button>}</header>
    {error && <Notice error>{error}</Notice>}{message && <Notice>{message}</Notice>}
    <div className="settings-columns"><div><form id="settings-church-form" onSubmit={event => void save(event)}>
      <section className="settings-panel settings-section"><h2>Church identity</h2><p className="muted">The name shown in this workspace and the reader experience.</p><div className="settings-identity"><span className="settings-identity-icon" aria-hidden="true">⌂</span><span><strong>{data.church.name}</strong><small>Rooted church workspace</small></span></div><label htmlFor="settings-church-name">Church name</label><input id="settings-church-name" value={name} onChange={event => { edited.current = true; setName(event.target.value); }} disabled={loading || !canManage} maxLength={200} required /><p className="fine">This does not change your sign-in or connected identity provider.</p></section>
      <section className="settings-panel settings-section"><h2>Time & locale</h2><p className="muted">One shared clock for your editorial schedule.</p><label htmlFor="settings-church-zone">Church default timezone</label><input id="settings-church-zone" value={zone} onChange={event => { edited.current = true; setZone(event.target.value); }} disabled={loading || !canManage} required placeholder="America/New_York" /><p className="fine">Use an IANA timezone. Changing this default does not move approved study dates. Edit each date explicitly to renew its approvals.</p>{data.slots[0] && <p className="settings-info">Schedule preview: {data.slots[0].localTime} in {data.slots[0].timeZone}</p>}</section>
    </form><section className="settings-panel settings-section"><h2>Appearance</h2><p className="muted">Make the church reading experience feel like your own.</p><div className="settings-row"><span><strong>Church theme</strong><small>Colors and reading mode for this church.</small><span className="settings-swatches" role="img" aria-label="Current theme colors">{swatches.map((color, index) => <i key={index} style={{ background: color }} />)}</span></span>{canTheme && <Link className="button" href={`/theme?church=${churchId}`}>Open theme settings ↗</Link>}</div></section></div>
    <aside><section className="settings-panel settings-section"><h2>Account data & privacy</h2><p className="muted">Requests for your personal account.</p><div className="settings-request"><strong>Take a copy of your data</strong><p>Request an export of your account data from this church workspace.</p><button disabled={busy} onClick={() => void request("export")}>Request my data export</button></div><div className="settings-request"><strong>Request account erasure</strong><p>Submit a review request. Nothing is removed immediately, and church records may need to be retained.</p>{confirmErase ? <div><p className="settings-info">A privacy administrator will review this request; submitting it does not immediately erase records or provider data.</p><button disabled={busy} onClick={() => void request("erasure")}>Confirm erasure review</button><button onClick={() => setConfirmErase(false)}>Cancel</button></div> : <button disabled={busy} onClick={() => setConfirmErase(true)}>Request account erasure review</button>}</div>{requests.length > 0 && <details><summary>My requests ({requests.length})</summary>{requests.map(item => <p className="fine" key={item.id}>{item.kind} · {item.status} · {new Date(item.createdAt).toLocaleDateString()}</p>)}</details>}</section><div className="settings-aside-note"><h2>Your church, thoughtfully set up.</h2><p>Church identity, time and appearance apply to everyone. Data and privacy requests apply only to your signed-in account.</p><p className="fine">Signed in as <strong>{session.user.displayName}</strong></p></div></aside></div>
  </div>;
}
