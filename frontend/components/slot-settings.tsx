"use client";

import { useState } from "react";
import { api, type Session } from "../lib/api";
import type { WorkspaceData, Slot } from "../lib/types";
import { churchToday, hasPublication, isInactive } from "../lib/study-dates";
import { StudyDateField } from "./study-date-field";
import { Notice } from "./ui";

export function SlotSettings({ data, seriesId, session, refresh, slot, initialDate, onCreated }: { data: WorkspaceData; seriesId?: string; session: Session; refresh: () => Promise<void>; slot?: Slot; initialDate?: string; onCreated?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(slot?.localDate ?? initialDate ?? churchToday(data.church.timeZone));
  const [time, setTime] = useState(slot?.localTime ?? "08:00");
  const [zone, setZone] = useState(slot?.timeZone ?? data.church.timeZone ?? "America/New_York");
  const contributors = data.members.filter(member => member.active !== false && member.capabilities.includes("plans:edit"));
  const [assignee, setAssignee] = useState(slot?.assigneeIds[0] ?? (contributors.some(member => member.userId === session.user.id) ? session.user.id : ""));
  const [assignmentChanged, setAssignmentChanged] = useState(false);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const capabilities = session.churches.find(church => church.id === data.church.id)?.capabilities ?? [];
  const published = slot ? hasPublication(slot, data) : false;
  if (!capabilities.includes("series:manage") || slot && isInactive(slot)) return null;
  const suffix = slot?.id ?? initialDate ?? "new";
  return <div className="slot-config"><button className="text-button" onClick={() => setOpen(!open)} aria-expanded={open}>{slot ? "Study date & assignment" : "+ Add a study date"}</button>{open && <form className="card" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (slot && !slot.etag) throw new Error("Refresh this study before changing its date or assignment.");
      let targetSeries = seriesId ?? data.series.find(series => series.title === "Study planning")?.id;
      if (!targetSeries) targetSeries = (await api<{ id: string }>(`/churches/${data.church.id}/series`, { method: "POST", csrf: session.csrfToken, body: { title: "Study planning", weekAnchor: date, timeZone: zone, sermonIds: [] } })).data.id;
      const assigneeIds = slot && !assignmentChanged ? slot.assigneeIds : assignee ? [assignee] : [];
      const result = await api<{ id: string }>(`/churches/${data.church.id}/${slot ? `slots/${slot.id}` : `series/${targetSeries}/slots`}`, { method: slot ? "PUT" : "POST", csrf: session.csrfToken, etag: slot?.etag, body: { localDate: date, localTime: time, timeZone: zone, assigneeIds } });
      setOpen(false); await refresh(); if (!slot) onCreated?.(result.data.id);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Study date could not be saved."); } finally { setBusy(false); }
  }}><h2>{slot ? "Study date & assignment" : "Add a study date"}</h2>{error && <Notice error>{error}</Notice>}<fieldset disabled={busy}><div className="form-grid"><StudyDateField id={`slot-date-${suffix}`} value={date} onChange={setDate} readOnly={published} /><div className="field"><label htmlFor={`slot-time-${suffix}`}>Local release time</label><input id={`slot-time-${suffix}`} type="time" value={time} onChange={event => setTime(event.target.value)} readOnly={published} required /></div><div className="field"><label htmlFor={`slot-zone-${suffix}`}>IANA timezone</label><input id={`slot-zone-${suffix}`} value={zone} onChange={event => setZone(event.target.value)} readOnly={published} required /></div><div><label htmlFor={`slot-assignee-${suffix}`}>Assigned contributor</label><select id={`slot-assignee-${suffix}`} value={assignee} onChange={event => { setAssignmentChanged(true); setAssignee(event.target.value); }}><option value="">Unassigned</option>{contributors.map(member => <option key={member.userId} value={member.userId}>{member.displayName}</option>)}</select></div></div></fieldset>{slot && !published && <Notice>Changing the delivery date or time renews final study approval and cancels pending delivery. The study content is retained.</Notice>}<button className="primary" disabled={busy || !!slot && !slot.etag}>{busy ? "Saving…" : slot ? "Save study settings" : "Add study date"}</button></form>}</div>;
}
