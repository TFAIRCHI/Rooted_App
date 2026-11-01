"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api, ApiError, type Session } from "../lib/api";
import { planFields, planFromPayload, planPayload, readRecovery, recoveryKey, type PlanDraft, type Recovery } from "../lib/drafts";
import type { Aggregate, Slot, WorkspaceData, Revision } from "../lib/types";
import { Notice } from "./ui";
import { AIAssistance } from "./ai-assistance";
import { canEditStudy } from "../lib/study-permissions";

const fieldHooks: Record<string, string> = { title: "title", primaryScripture: "scripture", learningObjective: "objective", outline: "outline", discussionQuestion: "question", notes: "notes" };

export function PlanEditor({ slot, initialPlan, data, session, registerSave }: { slot: Slot; initialPlan: Aggregate; initialContent?: Aggregate; data: WorkspaceData; session: Session; refresh: () => Promise<void>; registerSave?: (save: (() => Promise<Aggregate | null>) | null) => void }) {
  const [plan, setPlan] = useState(initialPlan);
  const [method, setMethod] = useState(initialPlan.head ? "manual" : "");
  const [draft, setDraft] = useState<PlanDraft>(() => planFromPayload(initialPlan.head?.payload));
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState(initialPlan.head ? "Saved to backend" : "No draft saved yet");
  const [error, setError] = useState("");
  const [recovered, setRecovered] = useState<Recovery | null>(null);
  const [conflict, setConflict] = useState<{ latest: Aggregate; base: PlanDraft; mine: PlanDraft } | null>(null);
  const [history, setHistory] = useState(false);
  const [assist, setAssist] = useState(false);
  const [adoptionUndo, setAdoptionUndo] = useState<PlanDraft | null>(null);
  const mounted = useRef(true);
  const latestDraft = useRef(draft);
  const pendingSave = useRef<Promise<Aggregate | null> | null>(null);
  const headRef = useRef(plan);
  const dirtyRef = useRef(false);
  const conflictRef = useRef(false);
  const saveAttempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const storageKey = recoveryKey(session.user.id, data.church.id, slot.id);
  const prefix = `/churches/${data.church.id}/plans/${plan.id}`;
  const capabilities = session.churches.find(church => church.id === data.church.id)?.capabilities ?? [];
  const canEdit = canEditStudy(capabilities, slot, session.user.id, "plans:edit");
  useEffect(() => { mounted.current = true; setRecovered(readRecovery(storageKey)); return () => { mounted.current = false; }; }, [storageKey]);
  useEffect(() => {
    if (initialPlan.version > headRef.current.version) {
      if (dirtyRef.current || pendingSave.current) { conflictRef.current = true; setConflict({ latest: initialPlan, base: planFromPayload(headRef.current.head?.payload), mine: latestDraft.current }); }
      else { headRef.current = initialPlan; setPlan(initialPlan); const next = planFromPayload(initialPlan.head?.payload); latestDraft.current = next; setDraft(next); setStatus("Current backend revision loaded"); }
    }
  }, [initialPlan]);
  const save = useCallback(async (): Promise<Aggregate | null> => {
    if (pendingSave.current) return pendingSave.current;
    if (!mounted.current || conflictRef.current) return null;
    if (!dirtyRef.current) return headRef.current;
    const candidate = latestDraft.current;
    const base = headRef.current;
    const body = { baseRevisionId: base.headRevisionId, payload: planPayload(candidate, base.head?.payload) };
    const fingerprint = JSON.stringify({ etag: base.etag, body });
    if (saveAttempt.current?.fingerprint !== fingerprint) saveAttempt.current = { fingerprint, key: crypto.randomUUID() };
    setStatus("Saving…");
    const action = (async () => {
      try {
        const result = await api<Aggregate>(prefix + "/revisions", { method: "POST", csrf: session.csrfToken, etag: base.etag, key: saveAttempt.current?.key, body });
        headRef.current = result.data;
        saveAttempt.current = null;
        const savedLatest = JSON.stringify(latestDraft.current) === JSON.stringify(candidate);
        if (savedLatest) dirtyRef.current = false;
        if (mounted.current) { setPlan(result.data); if (savedLatest) { setDirty(false); localStorage.removeItem(storageKey); } setStatus(`Saved to backend · ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`); }
        return result.data;
      } catch (failure) {
        if (mounted.current) {
          if (failure instanceof ApiError && [409, 412].includes(failure.status)) {
            conflictRef.current = true;
            try { const current = (await api<Aggregate>(prefix)).data; if (mounted.current) { setConflict({ latest: current, base: planFromPayload(base.head?.payload), mine: latestDraft.current }); setStatus("Conflict · your writing is preserved on this device"); } }
            catch (lookupFailure) { if (mounted.current) setError(lookupFailure instanceof Error ? lookupFailure.message : "Latest plan revision could not be loaded."); }
          } else { setStatus("Saved on this device; not synced"); setError(failure instanceof Error ? failure.message : "Could not save to backend."); }
        }
        return null;
      } finally { pendingSave.current = null; }
    })();
    pendingSave.current = action;
    return action;
  }, [prefix, session.csrfToken, storageKey]);
  useEffect(() => { if (!dirty || conflict) return; const timer = setTimeout(() => void save(), 800); return () => clearTimeout(timer); }, [dirty, draft, conflict, save]);
  useEffect(() => { const protect = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); }; window.addEventListener("beforeunload", protect); return () => window.removeEventListener("beforeunload", protect); }, [dirty]);
  function edit(next: PlanDraft) { latestDraft.current = next; dirtyRef.current = true; setDraft(next); setDirty(true); setError(""); try { localStorage.setItem(storageKey, JSON.stringify({ draft: next, savedAt: Date.now(), baseRevisionId: headRef.current.headRevisionId, base: planFromPayload(headRef.current.head?.payload) })); setStatus("Saved on this device · waiting to sync"); } catch { setStatus("Unsaved · device storage unavailable"); } }
  useEffect(() => {
    registerSave?.(async () => {
      let current = await save();
      while (mounted.current && current && dirtyRef.current && !conflictRef.current) current = await save();
      return mounted.current && !conflictRef.current ? current : null;
    });
    return () => registerSave?.(null);
  }, [registerSave, save]);
  return <div data-testid="day-pane">{error && <Notice error>{error}</Notice>}<div className="field"><label htmlFor="creation-method">How would you like to begin?</label><select data-testid="creation-method" id="creation-method" value={method} onChange={event => setMethod(event.target.value)}><option value="" disabled>Choose a starting point</option><option value="proposal">View proposed study plan</option><option value="manual">Create study plan from scratch</option></select></div><p className="fine">Optional supporting context. Only the completed study receives approval.</p>{recovered && <Notice><strong>Locally recovered working copy</strong><p>Your unsynced writing is kept on this device for 24 hours.</p><button onClick={() => { if (recovered.baseRevisionId !== headRef.current.headRevisionId) { conflictRef.current = true; setConflict({ latest: headRef.current, base: recovered.base ?? planFromPayload(null), mine: recovered.draft }); } edit(recovered.draft); setMethod("manual"); setRecovered(null); }}>Restore local draft</button><button onClick={() => { localStorage.removeItem(storageKey); setRecovered(null); }}>Keep server version</button></Notice>}{conflict && <section className="card conflict" role="alert"><h2>A newer draft exists.</h2><p>Resolve the differences before saving or submitting the study.</p>{planFields.map(([field, label]) => <div key={field} className="diff-field"><h3>{label}</h3><div className="diff-grid"><div><small>BASE</small><p>{conflict.base[field] || "Blank"}</p></div><div><small>YOUR WRITING</small><p>{conflict.mine[field] || "Blank"}</p></div><div><small>LATEST SERVER REVISION</small><p>{planFromPayload(conflict.latest.head?.payload)[field] || "Blank"}</p><button onClick={() => edit({ ...latestDraft.current, [field]: planFromPayload(conflict.latest.head?.payload)[field] })}>Use latest for this field</button></div></div></div>)}<button onClick={() => { headRef.current = conflict.latest; setPlan(conflict.latest); conflictRef.current = false; setConflict(null); dirtyRef.current = true; setDirty(true); }}>Save resolved fields against latest revision</button></section>}{method === "manual" && <section className="card editor-card"><div className="card-top"><h2>Optional planning notes</h2><span data-testid="save-status" className="save-status" role="status">{status}</span></div><fieldset disabled={!canEdit}><div className="form-grid">{planFields.map(([field, label]) => <div className="field full" key={field}><label htmlFor={`plan-${field}`}>{label}</label>{["outline", "notes"].includes(field) ? <textarea id={`plan-${field}`} data-testid={`plan-${fieldHooks[field]}`} value={draft[field]} onChange={event => edit({ ...latestDraft.current, [field]: event.target.value })} /> : <input id={`plan-${field}`} data-testid={`plan-${fieldHooks[field]}`} value={draft[field]} onChange={event => edit({ ...latestDraft.current, [field]: event.target.value })} />}</div>)}</div></fieldset><div className="actions"><button onClick={() => void save()} disabled={!dirty || !!conflict}>Save draft</button><button className="text-button" onClick={() => setAssist(!assist)} aria-expanded={assist}>Ask AI for assistance</button>{adoptionUndo && <button onClick={() => { edit(adoptionUndo); setAdoptionUndo(null); }}>Undo last AI adoption</button>}</div></section>}{(method === "proposal" || assist) && <AIAssistance dates={data.slots.filter(date => date.seriesId === slot.seriesId).map(date => date.localDate)} selectedDate={slot.localDate} mode={method === "proposal" ? "proposal" : "assistance"} churchId={data.church.id} aggregate={plan} session={session} unsaved={dirty} prepare={async () => { if (!headRef.current.headRevisionId) dirtyRef.current = true; let current = await save(); while (mounted.current && current && dirtyRef.current && !conflictRef.current) current = await save(); return mounted.current ? current : null; }} onAdopt={current => { setAdoptionUndo({ ...latestDraft.current }); setMethod("manual"); headRef.current = current; setPlan(current); const next = planFromPayload(current.head?.payload); latestDraft.current = next; setDraft(next); setDirty(false); dirtyRef.current = false; setStatus("Adopted field saved to backend"); }} />}<button className="text-button" onClick={() => setHistory(!history)} aria-expanded={history}>Revision history & comments</button>{history && <RevisionComments prefix={prefix} aggregate={plan} session={session} />}</div>;
}

export function RevisionComments({ prefix, aggregate, session }: { prefix: string; aggregate: Aggregate; session: Session }) {
  const [revisions, setRevisions] = useState<Revision[]>([]); const [comments, setComments] = useState<{ id: string; authorId: string; body: string; revisionId: string; fieldPath?: string }[]>([]); const [body, setBody] = useState(""); const [field, setField] = useState(""); const [error, setError] = useState("");
  const [members, setMembers] = useState<{ userId: string; displayName: string }[]>([]); const [mentionIds, setMentionIds] = useState<string[]>([]); const [commentRevision, setCommentRevision] = useState(aggregate.headRevisionId ?? ""); const [baseId, setBaseId] = useState(""); const [targetId, setTargetId] = useState("");
  useEffect(() => { api<{ items: { userId: string; displayName: string }[] }>(prefix.replace(/\/(plans|content)\/[^/]+$/, "/members")).then(result => setMembers(result.data.items)).catch(failure => setError(failure.message)); }, [prefix]);
  const load = useCallback(async () => { try { const results = await Promise.all([api<{ items: Revision[] }>(prefix + "/revisions"), api<{ items: typeof comments }>(prefix + "/comments")]); setRevisions(results[0].data.items); setComments(results[1].data.items); } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not load history."); } }, [prefix]);
  useEffect(() => { void load(); }, [load]);
  return <section className="card"><p className="eyebrow">Shared work · immutable history</p><h2>Revisions & comments</h2>{error && <Notice error>{error}</Notice>}<div className="form-grid"><div><label htmlFor={`revision-base-${aggregate.id}`}>Compare base revision</label><select id={`revision-base-${aggregate.id}`} value={baseId} onChange={event => setBaseId(event.target.value)}><option value="">Choose a revision</option>{revisions.map(revision => <option key={revision.id} value={revision.id}>Revision {revision.number}</option>)}</select></div><div><label htmlFor={`revision-target-${aggregate.id}`}>Compare target revision</label><select id={`revision-target-${aggregate.id}`} value={targetId} onChange={event => setTargetId(event.target.value)}><option value="">Choose a revision</option>{revisions.map(revision => <option key={revision.id} value={revision.id}>Revision {revision.number}</option>)}</select></div></div>{baseId && targetId && <div className="diff-grid"><div><strong>Base revision</strong><pre>{JSON.stringify(revisions.find(revision => revision.id === baseId)?.payload, null, 2)}</pre></div><div><strong>Target revision</strong><pre>{JSON.stringify(revisions.find(revision => revision.id === targetId)?.payload, null, 2)}</pre></div></div>}<div className="revision-list">{revisions.map(revision => <details key={revision.id}><summary>Revision {revision.number} · {revision.authorId} · {new Date(revision.createdAt).toLocaleString()}</summary><p className="fine">Hash: {revision.hash}</p><pre>{JSON.stringify(revision.payload, null, 2)}</pre></details>)}</div>{comments.map(comment => <article className="comment" key={comment.id}><strong>{comment.authorId}</strong><small>Revision {comment.revisionId} · {comment.fieldPath || "Whole plan"}</small><p>{comment.body}</p></article>)}<form onSubmit={async event => { event.preventDefault(); try { await api(prefix + "/comments", { method: "POST", csrf: session.csrfToken, etag: aggregate.etag, body: { revisionId: commentRevision, body, ...(field ? { fieldPath: field } : {}), mentionIds } }); setBody(""); await load(); } catch (failure) { setError(failure instanceof Error ? failure.message : "Comment was not saved."); } }}><label htmlFor={`comment-revision-${aggregate.id}`}>Comment on exact revision</label><select id={`comment-revision-${aggregate.id}`} value={commentRevision} onChange={event => setCommentRevision(event.target.value)}>{revisions.map(revision => <option key={revision.id} value={revision.id}>Revision {revision.number}</option>)}</select><label htmlFor="comment-field">Anchor comment to</label><select id="comment-field" value={field} onChange={event => setField(event.target.value)}><option value="">Whole revision</option>{planFields.map(([name, label]) => <option value={name} key={name}>{label}</option>)}</select><label htmlFor="revision-comment">Comment on this revision</label><textarea id="revision-comment" value={body} onChange={event => setBody(event.target.value)} required /><label htmlFor={`comment-mentions-${aggregate.id}`}>Notify church teammates · optional</label><select id={`comment-mentions-${aggregate.id}`} multiple value={mentionIds} onChange={event => setMentionIds(Array.from(event.target.selectedOptions, option => option.value))}>{members.map(member => <option value={member.userId} key={member.userId}>{member.displayName}</option>)}</select><p className="fine">Use Control or Command to select multiple active church members.</p><button disabled={!aggregate.head || !body.trim() || !commentRevision}>Add review comment</button></form></section>;
}
