"use client";

import { useEffect, useId, useRef, useState } from "react";
import { api, ApiError, type Session } from "../lib/api";
import type { Slot, WorkspaceData } from "../lib/types";
import { longDate, timeLabel } from "../lib/types";
import { hasPublication, isWithdrawn, studyTitle } from "../lib/study-dates";
import { Notice } from "./ui";

export type StudyLifecycleActionsProps = { data: WorkspaceData; session: Session; refresh: () => Promise<void>; onRemoved?: (slotId: string) => void } & ({ slot: Slot } | { studyId: string; title: string; etag: string; everPublished: boolean; withdrawn: boolean; publishedAt?: string; localDate?: string; localTime?: string; timeZone?: string });

export function StudyLifecycleActions(props: StudyLifecycleActionsProps) {
  const { data, session, refresh, onRemoved } = props;
  const slot: Slot = "slot" in props ? props.slot : { id: props.studyId, seriesId: "", planId: "", localDate: props.localDate ?? "", localTime: props.localTime ?? "", timeZone: props.timeZone ?? data.church.timeZone ?? "America/New_York", assigneeIds: [], etag: props.etag, everPublished: props.everPublished, withdrawn: props.withdrawn, publishedAt: props.publishedAt };
  const [action, setAction] = useState<"delete" | "withdraw" | "hard-delete" | null>(null);
  const [reason, setReason] = useState(""); const [confirmation, setConfirmation] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null); const cancel = useRef<HTMLButtonElement>(null); const trigger = useRef<HTMLButtonElement | null>(null); const id = useId();
  const capabilities = session.churches.find(church => church.id === data.church.id)?.capabilities ?? [];
  const published = hasPublication(slot, data); const withdrawn = isWithdrawn(slot); const title = "slot" in props ? studyTitle(slot, data) : props.title;
  const dateDescription = slot.localDate ? `${longDate(slot.localDate)}${slot.localTime ? ` · ${timeLabel(slot.localTime)}` : ""} · ${slot.timeZone}` : slot.publishedAt ? `Published ${new Date(slot.publishedAt).toLocaleString("en-US", { timeZone: slot.timeZone })} · ${slot.timeZone}` : "Retained historical study";
  const canDelete = capabilities.includes("studies:delete"); const canHardDelete = capabilities.includes("admin:manage") && withdrawn;
  useEffect(() => { if (action) { dialog.current?.showModal(); cancel.current?.focus(); } else if (dialog.current?.open) dialog.current.close(); }, [action]);
  function close() { if (busy) return; setAction(null); trigger.current?.focus(); }
  async function execute() {
    if (!action || !slot.etag || action !== "delete" && !reason.trim() || action === "hard-delete" && confirmation !== title) return;
    setBusy(true); setError("");
    try {
      await api(`/churches/${data.church.id}/slots/${slot.id}/${action}`, { method: "POST", csrf: session.csrfToken, etag: slot.etag, body: { reason: reason.trim(), ...(action === "hard-delete" ? { confirmation: `PERMANENTLY DELETE ${slot.id}` } : {}) } });
      setAction(null); setMessage(action === "withdraw" ? "Study withdrawn. Historical records retained." : action === "hard-delete" ? "Study permanently deleted." : "Study deleted.");
      onRemoved?.(slot.id); await refresh(); trigger.current?.focus();
    } catch (failure) { setError(failure instanceof ApiError && [409, 412].includes(failure.status) ? "This study changed. Close this dialog and refresh before trying again." : failure instanceof Error ? failure.message : "The study could not be updated."); }
    finally { setBusy(false); }
  }
  if ((!canDelete || withdrawn) && !canHardDelete || slot.deletedAt) return null;
  const label = action === "hard-delete" ? "Hard Delete" : action === "withdraw" ? "Withdraw" : "Delete";
  return <div className="study-lifecycle-actions">{message && <p role="status">{message}</p>}{canDelete && !withdrawn && <button onClick={event => { trigger.current = event.currentTarget; setReason(""); setConfirmation(""); setError(""); setAction(published ? "withdraw" : "delete"); }}>{published ? "Withdraw from members" : "Delete study"}</button>}{canHardDelete && <button onClick={event => { trigger.current = event.currentTarget; setReason(""); setConfirmation(""); setError(""); setAction("hard-delete"); }}>Hard Delete study</button>}<dialog ref={dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onCancel={event => { event.preventDefault(); close(); }} onClose={() => { if (!busy) setAction(null); }}><form onSubmit={event => { event.preventDefault(); void execute(); }}><h2 id={`${id}-title`}>{label} “{title}”?</h2><p>{dateDescription}</p><p id={`${id}-description`}>{action === "withdraw" ? "This study will be hidden from members. The historical publication and engagement records are retained. Pending delivery is cancelled. Messages already sent cannot be recalled." : action === "hard-delete" ? "This permanently erases the withdrawn study and its associated records. This action is irreversible. Messages already sent cannot be recalled." : "This removes the study date and its drafts from the active workspace and cancels pending delivery."}</p>{error && <Notice error>{error}</Notice>}{!slot.etag && <Notice error>Refresh the workspace to load this study’s current version before continuing.</Notice>}<label htmlFor={`${id}-reason`}>Reason {action !== "delete" ? "(required)" : "(optional)"}</label><textarea id={`${id}-reason`} maxLength={500} required={action !== "delete"} value={reason} onChange={event => setReason(event.target.value)} disabled={busy} />{action === "hard-delete" && <><label htmlFor={`${id}-confirmation`}>Type the study title to confirm: {title}</label><input id={`${id}-confirmation`} value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" disabled={busy} required /></>}<div className="actions"><button ref={cancel} type="button" onClick={close} disabled={busy}>Cancel</button><button className="danger" disabled={busy || !slot.etag || action !== "delete" && !reason.trim() || action === "hard-delete" && confirmation !== title}>{busy ? "Working…" : `${label} study`}</button></div></form></dialog></div>;
}
