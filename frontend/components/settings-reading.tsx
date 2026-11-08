"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, type Session } from "../lib/api";
import type { WorkspaceData } from "../lib/types";
import { longDate, timeLabel } from "../lib/types";
import { PublicAccessSettings } from "./public-access-settings";
import { Notice } from "./ui";

type ReadingSettings = { readingPolicy: string; discussionsEnabled: boolean; timeZone?: string };

export function SettingsReading({ data, session, refresh }: { data: WorkspaceData; session: Session; refresh: () => Promise<void> }) {
  const churchId = data.church.id;
  const caps = session.churches.find(item => item.id === churchId)?.capabilities ?? [];
  const canManage = caps.includes("settings:manage");
  const [settings, setSettings] = useState<ReadingSettings | null>(null);
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setSettings((await api<ReadingSettings>(`/churches/${churchId}/settings`)).data); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Reading policy could not be loaded."); }
  }, [churchId]);
  useEffect(() => { void load(); }, [load]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!settings || !canManage) return;
    setBusy(true); setError(""); setMessage("");
    try { await api(`/churches/${churchId}/settings`, { method: "POST", csrf: session.csrfToken, body: { discussionsEnabled: settings.discussionsEnabled } }); setMessage("Discussion policy saved."); await refresh(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Discussion policy could not be saved."); }
    finally { setBusy(false); }
  }
  const reviewers = data.members.filter(member => member.capabilities.includes("content:approve") || member.capabilities.includes("plans:approve") || member.capabilities.includes("publication:schedule"));
  return <div className="settings-page"><header className="settings-heading"><div><p className="eyebrow">Workspace settings</p><h1>A clear path from study to community.</h1><p className="muted">Set who can read, how conversations work and who can bring a study to publication.</p></div>{canManage && <button className="primary" type="submit" form="settings-reading-form" disabled={busy || !settings}>{busy ? "Saving…" : "Save reading policy"}</button>}</header>
    {error && <Notice error>{error}</Notice>}{message && <Notice>{message}</Notice>}
    <div className="settings-columns"><div><form id="settings-reading-form" onSubmit={event => void save(event)}><section className="settings-panel settings-section"><h2>Audience & discussions</h2><p className="muted">Your current church reading policy.</p><label htmlFor="settings-reading-audience">Who can read published studies?</label><select id="settings-reading-audience" value={settings?.readingPolicy ?? ""} disabled aria-describedby="settings-reading-gate"><option value="">Loading…</option><option value="members">Church members only</option><option value="public">Anyone with the published church link</option></select><p id="settings-reading-gate" className="fine">To change reading access, use the reviewed public access controls below. A link reader does not need an account.</p><div className="settings-row"><label className="settings-toggle-label" htmlFor="settings-discussions"><strong>Enable moderated discussions</strong><small>New comments enter moderation before appearing to readers.</small></label><input id="settings-discussions" type="checkbox" checked={settings?.discussionsEnabled ?? false} disabled={!settings || !canManage} onChange={event => setSettings(current => current ? { ...current, discussionsEnabled: event.target.checked } : current)} /></div><p className="settings-info">Discussion authorship and moderation context remain visible to authorized church team members. Guest comments require a name and church review.</p></section></form>
      <section className="settings-panel settings-section"><h2>Editorial schedule</h2><p className="muted">Date-specific release times are stored on the backend.</p><div className="settings-row"><span>{settings?.timeZone ?? data.church.timeZone ?? "Church timezone"}</span><Link className="inline-link" href={`/settings/church?church=${churchId}`}>Church settings ↗</Link></div>{data.slots.length ? data.slots.slice(0,8).map(slot => <div className="settings-row" key={slot.id}><span><strong>{longDate(slot.localDate)}</strong><small>{slot.timeZone}</small></span><strong>{timeLabel(slot.localTime)}</strong></div>) : <p className="muted">No study dates are scheduled yet.</p>}<p className="fine">Calendar changes require renewed approvals before release.</p></section>
      {canManage && <PublicAccessSettings churchId={churchId} session={session} onChanged={() => { void load(); void refresh(); }} />}
    </div><aside><section className="settings-panel settings-section"><h2>Review authority</h2><p className="muted">Authorized reviewers and publishers for this church.</p>{reviewers.length ? reviewers.map(member => <div className="settings-row" key={member.userId}><span><strong>{member.displayName}</strong><small>{member.userId === session.user.id ? "You · " : ""}{member.capabilities.includes("admin:manage") ? "Administrator" : member.capabilities.includes("content:approve") ? "Reviewer" : "Publisher"}</small></span><span aria-hidden="true">♢</span></div>) : <p className="muted">No review authority is visible in the current workspace.</p>}<p className="settings-info">A study’s author must use a different reviewer. Self-review is not allowed.</p><p className="fine">Only policy owners may grant sensitive authority. No one can change their own grants.</p>{caps.includes("memberships:manage") && <Link className="button" href={`/settings/members?church=${churchId}`}>Manage member access ↗</Link>}</section><section className="settings-publishing-path"><h2>The publishing path</h2><ol><li><strong>Create</strong><small>A contributor prepares the study.</small></li><li><strong>Review</strong><small>A different authorized person reviews.</small></li><li><strong>Publish</strong><small>An authorized publisher releases it.</small></li></ol></section></aside></div>
  </div>;
}
