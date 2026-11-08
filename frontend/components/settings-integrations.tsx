"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Session } from "../lib/api";
import type { WorkspaceData } from "../lib/types";
import type { ProviderStatus } from "./ai-assistance";
import { Notice } from "./ui";

type ProviderConfig = { configured: boolean; monthlyTokenLimit?: number; profile?: string; profileVersion?: string; rightsConfirmed?: boolean; smsSegmentLimit?: number; transcriptionSecondLimit?: number };

export function SettingsIntegrations({ data, session }: { data: WorkspaceData; session: Session }) {
  const churchId = data.church.id;
  const canManage = session.churches.find(item => item.id === churchId)?.capabilities.includes("settings:manage") ?? false;
  const prefix = `/churches/${churchId}/providers`;
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [loaded, setLoaded] = useState(false);
  const edited = useRef(false);
  const [configured, setConfigured] = useState(false);
  const [profile, setProfile] = useState(""); const [version, setVersion] = useState("");
  const [monthly, setMonthly] = useState(""); const [smsLimit, setSmsLimit] = useState("0"); const [transcriptionLimit, setTranscriptionLimit] = useState("0"); const [rights, setRights] = useState(false);
  const [organization, setOrganization] = useState(""); const [channels, setChannels] = useState(""); const [evidence, setEvidence] = useState(""); const [pcoRights, setPcoRights] = useState(false);
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const [current, settings] = await Promise.all([api<ProviderStatus>(`${prefix}/status`), api<ProviderConfig>(`${prefix}/settings`)]);
      setStatus(current.data); setConfigured(settings.data.configured);
      if (settings.data.configured && !edited.current) { setProfile(settings.data.profile ?? ""); setVersion(settings.data.profileVersion ?? ""); setMonthly(String(settings.data.monthlyTokenLimit ?? "")); setSmsLimit(String(settings.data.smsSegmentLimit ?? 0)); setTranscriptionLimit(String(settings.data.transcriptionSecondLimit ?? 0)); setRights(!!settings.data.rightsConfirmed); }
      setError("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Integration settings could not be loaded."); }
    finally { setLoaded(true); }
  }, [prefix]);
  useEffect(() => { if (canManage) void load(); }, [canManage, load]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try { await api(`${prefix}/settings`, { method: "POST", csrf: session.csrfToken, body: { monthlyTokenLimit: Number(monthly), profile: profile.trim(), profileVersion: version.trim(), rightsConfirmed: rights, smsSegmentLimit: Number(smsLimit), transcriptionSecondLimit: Number(transcriptionLimit) } }); setMessage("Church assistance profile and hard limits saved. This does not activate or verify an external service."); await load(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Provider settings could not be saved."); }
    finally { setBusy(false); }
  }
  async function action(path: string, body: Record<string, unknown> = {}) {
    setBusy(true); setError(""); setMessage("");
    try { await api(`${prefix}${path}`, { method: "POST", csrf: session.csrfToken, body }); setMessage(path.endsWith("/sync") ? "Read-only source import queued." : path.endsWith("/disconnect") ? "Disconnect requested; revocation is pending." : "Sender configuration recorded. Live delivery remains unverified."); await load(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Integration action failed."); }
    finally { setBusy(false); }
  }
  async function connectPco(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { const result = await api<{ authorizationUrl: string }>(`${prefix}/pco/oauth/start`, { method: "POST", csrf: session.csrfToken, body: { organizationId: organization.trim(), channelIds: channels.split(",").map(item => item.trim()).filter(Boolean), rights: { confirmed: true, evidence: evidence.trim() } } }); window.location.assign(result.data.authorizationUrl); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Planning Center authorization could not start."); setBusy(false); }
  }
  if (!canManage) return <section className="card"><h1>Integrations & assistance</h1><p>Church settings authority is required to configure integrations.</p></section>;
  return <div className="settings-page"><header className="settings-heading"><div><p className="eyebrow">Workspace settings</p><h1>Helpful tools. Thoughtful boundaries.</h1><p className="muted">Connect source material and communication services, with your church always in control.</p></div><button className="primary" type="submit" form="settings-provider-form" disabled={!loaded || busy || !profile.trim() || !version.trim() || !monthly || !rights}>Save settings</button></header>
    {error && <Notice error>{error}</Notice>}{message && <Notice>{message}</Notice>}
    <p className="settings-info">{status ? status.externalServicesEnabled ? "External services are operator-enabled. Church permissions, reviewed sources, and budgets still apply." : "External services are disabled by the operator. Manual planning and transcript upload remain available." : "Checking external service availability…"}</p>
    <div className="settings-columns"><div><form id="settings-provider-form" onSubmit={event => void save(event)}><section className="settings-panel settings-section"><h2>AI assistance</h2><p className="muted">A church profile and enforced monthly limit are required before use.</p><div className="settings-row"><strong>Church AI profile</strong><span className="settings-tag">{configured ? "Profile saved" : "Not configured"}</span></div><label htmlFor="settings-ai-profile">Assistance profile and biblical guidance</label><textarea id="settings-ai-profile" value={profile} onChange={event => { edited.current = true; setProfile(event.target.value); }} required maxLength={8000} placeholder="Describe your church’s teaching voice, biblical principles, and denominational guidance." /><p className="fine">This guidance is reviewed by your church. Generated material still requires source and pastoral review.</p><div className="settings-form-grid"><div><label htmlFor="settings-ai-version">Profile version</label><input id="settings-ai-version" value={version} onChange={event => { edited.current = true; setVersion(event.target.value); }} required maxLength={100} placeholder="v1" /></div><div><label htmlFor="settings-ai-monthly">Monthly hard token limit</label><input id="settings-ai-monthly" type="number" min="1" max="100000000" value={monthly} onChange={event => { edited.current = true; setMonthly(event.target.value); }} required /></div></div><p className="fine">There is no separate daily budget in the current server contract. The monthly token limit is enforced by the backend.</p><details><summary>Communication and transcription limits</summary><div className="settings-form-grid"><div><label htmlFor="settings-sms-limit">SMS segment limit</label><input id="settings-sms-limit" type="number" min="0" max="1000000" value={smsLimit} onChange={event => { edited.current = true; setSmsLimit(event.target.value); }} required /></div><div><label htmlFor="settings-transcription-limit">Transcription seconds limit</label><input id="settings-transcription-limit" type="number" min="0" max="1000000" value={transcriptionLimit} onChange={event => { edited.current = true; setTranscriptionLimit(event.target.value); }} required /></div></div></details><label className="check"><input type="checkbox" checked={rights} onChange={event => { edited.current = true; setRights(event.target.checked); }} required />I confirm the church has permission to use selected sources with these services.</label><p className="settings-info">{status?.openai.configured ? "AI provider configured; live use has not been verified here." : "AI provider unavailable. Manual planning works normally."}</p></section></form>
      <section className="settings-panel settings-section"><h2>Audio transcription</h2><p className="muted">Bring sermon audio or a prepared transcript into your study planning.</p><div className="settings-row"><strong>Transcription service</strong><span className="settings-tag">{status?.transcription.configured ? "Configured · unverified" : "Unavailable"}</span></div><p>Manual transcript upload remains available even when automated transcription is unavailable.</p><Link className="button" href={`/sermons?church=${churchId}`}>Upload transcript ↗</Link></section></div>
    <aside><section className="settings-panel settings-section"><h2>Planning Center</h2><p className="muted">Read-only source import for planning and studies.</p>{status?.connections.filter(item => item.provider === "pco").map(item => <div className="settings-connection" key={item.id}><span className="settings-tag">{item.status}</span><p>Organization {item.organization_id ?? "unknown"}</p><div className="actions"><button disabled={busy || item.status !== "authorized"} onClick={() => void action(`/pco/connections/${item.id}/sync`)}>Import sources</button><button disabled={busy || ["revoked", "disconnect_pending"].includes(item.status)} onClick={() => void action(`/pco/connections/${item.id}/disconnect`)}>Disconnect</button></div></div>)}{!status?.connections.some(item => item.provider === "pco") && <p className="settings-tag">Not connected</p>}<details><summary>Connect Planning Center</summary><form onSubmit={event => void connectPco(event)}><p className="fine">Rooted reads only selected channels. Authorization does not grant church membership or editorial approval.</p><label htmlFor="settings-pco-organization">Organization ID</label><input id="settings-pco-organization" value={organization} onChange={event => setOrganization(event.target.value)} required /><label htmlFor="settings-pco-channels">Channel IDs, comma separated</label><input id="settings-pco-channels" value={channels} onChange={event => setChannels(event.target.value)} required /><label htmlFor="settings-pco-evidence">Permission and provenance evidence</label><textarea id="settings-pco-evidence" value={evidence} onChange={event => setEvidence(event.target.value)} required minLength={8} /><label className="check"><input type="checkbox" checked={pcoRights} onChange={event => setPcoRights(event.target.checked)} required />I authorize read-only import for these channels.</label><button disabled={busy || !status?.externalServicesEnabled || !pcoRights || evidence.trim().length < 8}>Authorize selected sources</button></form></details></section>
      <section className="settings-panel settings-section"><h2>SMS sender</h2><p className="muted">Register the configured church SMS sender.</p><div className="settings-row"><strong>SMS service</strong><span className="settings-tag">{status?.twilio.configured ? "Configured · unverified" : "Not configured"}</span></div><p>Server credentials, sender registration, and operator activation are prerequisites. Recipients remain suppressed until consent is recorded.</p><button disabled={busy || !status?.twilio.configured} onClick={() => void action("/twilio/connect")}>Register configured sender</button><p><Link className="inline-link" href={`/delivery?church=${churchId}`}>Manage consent & delivery ↗</Link></p></section><div className="settings-aside-note"><h3>Need help connecting a service?</h3><p>Check the church setup guidance and your provider credentials before activating a service.</p><Link className="inline-link" href="/questions">Open help ↗</Link></div></aside></div>
  </div>;
}
