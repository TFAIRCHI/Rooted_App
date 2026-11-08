"use client";

import Link from "next/link";
import { useState } from "react";
import { api, type Session } from "../lib/api";
import type { WorkspaceData, Sermon } from "../lib/types";
import { Badge, Field, Heading, Notice } from "./ui";
import { SourceManager } from "./source-manager";
import { PublicDelivery } from "./public-delivery";
import { ModerationInbox } from "./moderation-inbox";
import { PublicModerationInbox } from "./public-moderation-inbox";

export { Dashboard } from "./dashboard";

export function Sermons({ data, session, refresh }: { data: WorkspaceData; session: Session; refresh: () => Promise<void> }) {
  const [title, setTitle] = useState(""); const [speaker, setSpeaker] = useState(""); const [date, setDate] = useState("2026-10-18"); const [passages, setPassages] = useState(""); const [notes, setNotes] = useState(""); const [rights, setRights] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState("");
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(""); setSaved(""); try { const result = await api<Sermon>(`/churches/${data.church.id}/sermons`, { method: "POST", csrf: session.csrfToken, body: { title, speaker, preachedDate: date, passages: passages.split(/\n|;/).map(value => value.trim()).filter(Boolean), notes } }); setSaved(`“${result.data.title}” saved to the backend.`); setTitle(""); setSpeaker(""); setPassages(""); setNotes(""); setRights(false); await refresh(); } catch (failure) { setError(failure instanceof Error ? failure.message : "Sermon could not be saved."); } finally { setBusy(false); } }
  return <><Heading eyebrow="Source library" title="Begin with the message.">Your own sermon notes are enough to get started. Source context stays with the work.</Heading><div className="columns"><form className="card" onSubmit={submit}><div className="card-top"><h2>Add a sermon</h2><Badge>Manual entry</Badge></div>{error && <Notice error>{error}</Notice>}{saved && <Notice>{saved}</Notice>}<div className="form-grid"><Field label="Sermon title" name="sermon-title" value={title} onChange={setTitle} required /><Field label="Speaker" name="sermon-speaker" value={speaker} onChange={setSpeaker} required /><Field label="Preached date" name="sermon-date" type="date" value={date} onChange={setDate} required /><Field label="Scripture references · separate with semicolons" name="sermon-passages" value={passages} onChange={setPassages} /><Field label="Source notes" name="sermon-notes" value={notes} onChange={setNotes} multiline /></div><label className="check"><input type="checkbox" checked={rights} onChange={event => setRights(event.target.checked)} required />I have permission to use these sermon notes.</label><button className="primary" disabled={busy || !rights}>{busy ? "Saving sermon…" : "Save sermon"}</button><p className="fine">Manual source notes · no transcript or external import is implied.</p></form><aside><section className="card"><p className="eyebrow">Sermon library</p><h2>Your source material</h2>{data.sermons.length ? data.sermons.map(sermon => <details key={sermon.id} className="sermon-item"><summary>{sermon.title}</summary><p className="fine">{sermon.speaker} · {sermon.preachedDate}</p><p>{sermon.passages.join(" · ")}</p><p className="preserve-lines">{sermon.notes}</p></details>) : <p className="muted">No sermons yet. Save your first notes to build a series around them.</p>}</section><section className="card"><h3>Integrations are optional.</h3><p className="muted">Planning Center is not connected. Manual planning works without an import.</p><Link href={`/settings/integrations?church=${data.church.id}`} className="inline-link">View integrations →</Link></section></aside></div><SourceManager data={data} session={session} /></>;
}

export function Delivery({ data, session }: { data: WorkspaceData; session: Session }) { return <PublicDelivery data={data} session={session} />; }

export function Moderation({ data, session }: { data: WorkspaceData; session: Session }) { return <><ModerationInbox data={data} session={session} /><PublicModerationInbox churchId={data.church.id} session={session} /></>; }
