"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CowriterMenu } from "./cowriter-menu";
import { createPortal } from "react-dom";
import { api, type Session } from "../lib/api";
import type { WorkspaceData } from "../lib/types";
import type { WorkflowPlan, WorkflowSummary } from "../../backend/contracts/study-workflow";
import { CreatorIcon } from "./creator-icons";
const activeStates = new Set(["plan_queued", "planning", "queued", "generating"]);
type RunList = { items: { id: string; state: string; theme: string | null; created_at:string }[]; configured: boolean };
type LibrarySource = { id: string; reviewed: boolean; payload: { spans?: { text: string }[] } };
export function GuidedStudyCowriter({ data, session }: { data: WorkspaceData; session: Session }) {
  const [mounted, setMounted] = useState(false), [open, setOpen] = useState(false), [expanded, setExpanded] = useState(false);
  const [run, setRun] = useState<WorkflowSummary | null>(null), [plan, setPlan] = useState<WorkflowPlan | null>(null);
  const [list, setList] = useState<RunList>({ items: [], configured: false }), [selected, setSelected] = useState("");
  const [seriesId, setSeriesId] = useState(data.series[0]?.id ?? ""), [localTime, setLocalTime] = useState("08:00");
  const [task, setTask] = useState("");
  const [sourceText, setSourceText] = useState(""), [filename, setFilename] = useState(""), [reviewed, setReviewed] = useState(false);
  const [sources, setSources] = useState<LibrarySource[]>([]), [libraryId, setLibraryId] = useState("");
  const [reply, setReply] = useState(""), [resolved, setResolved] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [eraseConfirm, setEraseConfirm] = useState(false), [reviewConversationSource,setReviewConversationSource]=useState(false);
  const [menuOpen, setMenuOpen] = useState(false), [showConversation, setShowConversation] = useState(false);
  const chat = useRef<HTMLDivElement>(null), composer = useRef<HTMLTextAreaElement>(null), followLatest = useRef(true);
  const id = useId(), launcher = useRef<HTMLButtonElement>(null), closeButton = useRef<HTMLButtonElement>(null);
  const alive = useRef(true), sending = useRef(false), file = useRef<HTMLInputElement>(null), attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const scopeKey = `rooted:workflow:${session.user.id}:${data.church.id}`, prefix = `/churches/${data.church.id}/study-workflows`;
  const caps = session.churches.find(church => church.id === data.church.id)?.capabilities ?? [];
  const allowed = ["ai:use", "series:manage", "plans:edit", "content:edit"].every(cap => caps.includes(cap));
  useEffect(() => { alive.current = true; setMounted(true); try { setSelected(localStorage.getItem(scopeKey) ?? ""); } catch { /* Storage is optional. */ } return () => { alive.current = false; }; }, [scopeKey]);
  const remember = useCallback((value: string) => { setSelected(value); try { if (value) localStorage.setItem(scopeKey, value); else localStorage.removeItem(scopeKey); } catch { /* Server state still persists. */ } }, [scopeKey]);
  const accept = useCallback((value: WorkflowSummary) => { if (!alive.current) return; setRun(value); remember(value.id); setPlan(structuredClone(value.plan)); setResolved(false); }, [remember]);
  useEffect(() => {
    function launch() { setShowConversation(false); setMenuOpen(false); setOpen(true); }
    window.addEventListener("rooted:plan-studies", launch);
    return () => window.removeEventListener("rooted:plan-studies", launch);
  }, []);
  useEffect(() => {
    if (!open || !allowed) return;
    let current = true; closeButton.current?.focus();
    api<RunList>(prefix).then(result => { if (current) setList(result.data); }).catch(failure => { if (current) setError(failure instanceof Error ? failure.message : "Cannot load workflows."); });
    api<{ items: LibrarySource[] }>(`/churches/${data.church.id}/providers/sources`).then(result => { if (current) setSources(result.data.items.filter(source => source.reviewed)); }).catch(() => {});
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); launcher.current?.focus(); } }
    document.addEventListener("keydown", escape);
    return () => { current = false; document.removeEventListener("keydown", escape); };
  }, [open, allowed, prefix, data.church.id]);
  useEffect(() => {
    if (!open || !selected || !allowed) return;
    let current = true;
    async function poll() {
      try {
        const result = await api<WorkflowSummary>(prefix + "/" + selected);
        if (!current || !alive.current) return;
        // Never overwrite unsaved direction edits during a status poll.
        setRun(previous => { if (previous?.id !== result.data.id || previous.version !== result.data.version) { setPlan(structuredClone(result.data.plan)); setResolved(false); } return result.data; });
      } catch (failure) { if (current) setError(failure instanceof Error ? failure.message : "Cannot resume workflow."); }
    }
    void poll(); const timer = window.setInterval(() => { void poll(); }, 1500);
    return () => { current = false; window.clearInterval(timer); };
  }, [open, selected, allowed, prefix]);
  useEffect(() => {
    if(open&&showConversation&&followLatest.current)chat.current?.scrollTo({top:chat.current.scrollHeight,behavior:"auto"});
  },[open,showConversation,run?.id,run?.version,run?.messages.length]);
  useEffect(()=>{setReviewConversationSource(false);},[run?.sourceHash]);
  async function command(path: string, body: unknown, erased = false) {
    if (sending.current) return;
    sending.current = true; followLatest.current=true; setBusy(true); setError("");
    const fingerprint = JSON.stringify({ path, body });
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    try {
      const result = await api<WorkflowSummary>(prefix + path, { method: "POST", csrf: session.csrfToken, key: attempt.current.key, body });
      attempt.current = null;
      if (!alive.current) return;
      if (erased) { setRun(null); setPlan(null); remember(""); setEraseConfirm(false); }
      else { accept(result.data); setShowConversation(true); setMenuOpen(false); }
      if (path === "" || path === "/chat") setTask("");
      setReply("");
      requestAnimationFrame(()=>composer.current?.focus());
      const latest = await api<RunList>(prefix); if (alive.current) setList(latest.data);
    } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : "The workflow command failed. Your entries were retained."); }
    finally { sending.current = false; if (alive.current) setBusy(false); }
  }
  function submitSetup() {
    const source=libraryId?{librarySourceId:libraryId}:{sourceText};
    const details={seriesId,localTime,task,...source,reviewed:true,rightsConfirmed:true};
    if(run&&!run.plan)void command(`/${run.id}/setup`,{...details,version:run.version});
    else void command("",{...details,assigneeId:session.user.id,...(filename?{filename}:{})});
  }
  function sendInitialMessage() {
    if(!task.trim()||sending.current)return;
    void command("/chat",{task:task.trim()});
  }
  async function attach(selectedFile: File | undefined) {
    if (!selectedFile) return;
    if (!/\.txt$/i.test(selectedFile.name) || selectedFile.size > 262144) { setError("Choose one UTF-8 .txt file up to 256 KiB. Audio, video, images and PDF are not connected."); return; }
    try { const text = new TextDecoder("utf-8", { fatal: true }).decode(await selectedFile.arrayBuffer()); if (alive.current) { setSourceText(text); setFilename(selectedFile.name); setLibraryId(""); setReviewed(false); } } catch { setError("This file is not valid UTF-8 text."); }
  }
  function changeDay(index: number, field: "date" | "title" | "objective" | "theme" | "references", value: string) {
    if (!plan) return; const next = structuredClone(plan);
    if (field === "references") next.days[index].references = value.split("\n").map(ref => ref.trim()).filter(Boolean); else next.days[index][field] = value;
    setPlan(next);
  }
  if (!mounted || !allowed) return null;
  const working = run && activeStates.has(run.state), editable = run && !working && run.state !== "drafts_saved" && run.state !== "erased";
  const dayIndex=run?.mapping.length??0;
  const intentReview=Boolean(run?.sequential&&!run.intentConfirmed);
  const dirtyPlan = Boolean(run?.plan && plan && JSON.stringify(run.plan) !== JSON.stringify(plan));
  return createPortal(<>
    <button ref={launcher} type="button" className="cowriter-launcher workflow-launcher" aria-label="Plan studies with co-writer" aria-expanded={open} aria-controls={id} hidden={open} onClick={() => { setShowConversation(false); setMenuOpen(false); setOpen(true); }}><CreatorIcon name="sparkles" size={26} /></button>
    <aside id={id} className={`study-cowriter cowriter-popup workflow-popup${expanded ? " cowriter-expanded" : ""}`} role="dialog" aria-label="Study planning co-writer" hidden={!open}>
      <header className="cowriter-header"><div className="cowriter-identity"><span><CreatorIcon name="sparkles" /></span><div><h2>Study Co-writer</h2><p>Plan studies · {data.church.name}</p></div></div><div className="cowriter-header-actions"><CowriterMenu open={menuOpen} onOpenChange={setMenuOpen}><section><h3>Conversations</h3>        <div className="workflow-toolbar"><label>Previous conversations<select aria-label="Previous planning conversations" value={selected} onChange={event => { setRun(null); setPlan(null); remember(event.target.value); setShowConversation(!!event.target.value); setMenuOpen(false); setError(""); }}>{<option value="">New conversation</option>}{list.items.map(item => <option key={item.id} value={item.id}>{item.theme || "Planning request"} · {(item.id===run?.id?run.state:item.state).replaceAll("_", " ")}</option>)}</select></label><button type="button" disabled={busy} onClick={() => { setRun(null); setPlan(null); remember(""); setShowConversation(false); setTask(""); setError(""); }}>New conversation</button></div>
</section><section>        {((!run && !selected)||(run&&!run.plan&&!working)) && <form onSubmit={event => { event.preventDefault(); submitSetup(); }}>
          <h3>Study planning</h3><label>Your request<textarea aria-label="Study planning request" value={task} maxLength={2000} onChange={event => setTask(event.target.value)} /></label>
          <label>Study series<select aria-label="Planning study series" value={seriesId} onChange={event => setSeriesId(event.target.value)}><option value="">Choose existing series</option>{data.series.map(series => <option key={series.id} value={series.id}>{series.title}</option>)}</select></label>
          <p>Assigned to {session.user.displayName} · {data.church.timeZone ?? "church timezone"}</p><label>Local study time<input aria-label="Planned study time" type="time" value={localTime} onChange={event => setLocalTime(event.target.value)} /></label>
          <h3>Sources</h3><label>Reviewed library source<select aria-label="Planning library source" value={libraryId} onChange={event => { setLibraryId(event.target.value); const source = sources.find(source => source.id === event.target.value); if (source) setSourceText(source.payload.spans?.map(span => span.text).join("\n") ?? ""); setReviewed(false); }}><option value="">Paste or upload text instead</option>{sources.map(source => <option key={source.id} value={source.id}>{source.payload.spans?.[0]?.text.slice(0, 65) || source.id}</option>)}</select></label>
          <label>Review sermon outline<textarea aria-label="Planning sermon outline" value={sourceText} maxLength={262144} readOnly={!!libraryId} onChange={event => { setSourceText(event.target.value); setFilename(""); setReviewed(false); }} placeholder="Include the sermon passage, for example John 6:68." /></label>
          <button type="button" onClick={() => file.current?.click()}>Attach .txt outline</button><input ref={file} className="sr-only" type="file" accept=".txt,text/plain" aria-label="Planning source file" onChange={event => { void attach(event.target.files?.[0]); event.target.value = ""; }} />
          <label className="workflow-check"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} /> I reviewed this source and have permission to use it.</label>
          <p>The co-writer will confirm its understanding first. Each day needs its own review and confirmation before creation.</p><button className="primary" type="submit" disabled={busy || !reviewed || !sourceText.trim() || !seriesId || (!run && !task.trim()) || !list.configured}>{run?"Develop the study plan":"Discuss my request"}</button>{!list.configured && <p>The Azure co-writer is not configured or enabled.</p>}
        </form>}
</section>{run&&plan&&run.plan&&<section className="workflow-content"><h3>Study direction and sources</h3>            <details><summary>Reviewed source and grounding</summary><p className="cowriter-proposed-text">{run.sourceText}</p><small>Source version {run.sourceId}; Scripture references require human verification.</small></details>
            <details open={run.state!=="drafts_saved"}><summary>{run.state==="drafts_saved"?"View agreed plan and direction":"Review the current day and direction"}</summary><fieldset disabled={busy || !editable} className="workflow-direction"><legend>Plan and direction</legend>
              <label>Overall theme<input aria-label="Workflow theme" value={plan.theme} onChange={event => setPlan({ ...plan, theme: event.target.value })} /></label>
              <label>Week beginning Sunday<input aria-label="Workflow week beginning" disabled={run.sequential} type="date" value={plan.weekStart} onChange={event => setPlan({ ...plan, weekStart: event.target.value })} /></label>
              <label>Daily progression<textarea aria-label="Workflow progression" value={plan.progression} onChange={event => setPlan({ ...plan, progression: event.target.value })} /></label>
              {([['audience', 'Audience'], ['takeaway', 'Central takeaway'], ['depth', 'Reading depth'], ['translation', 'Translation preference'], ['illustrations', 'Illustrations'], ['application', 'Application direction']] as const).map(([key, label]) => <label key={key}>{label}<textarea aria-label={label} value={plan.direction[key]} onChange={event => setPlan({ ...plan, direction: { ...plan.direction, [key]: event.target.value } })} /></label>)}
              {plan.assumptions.length > 0 && <div><strong>Proposed assumptions</strong><ul>{plan.assumptions.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
              {plan.questions.length > 0 && <div><strong>Resolve before generation</strong><ul>{plan.questions.map((item, index) => <li key={index}>{item}</li>)}</ul><label className="workflow-check"><input type="checkbox" checked={resolved} onChange={event => setResolved(event.target.checked)} /> I resolved these questions in the direction fields above.</label></div>}
              {plan.days.map((day, index) => (!run.sequential||index===dayIndex) && <section key={index} className="workflow-day-card"><h4>Day {index + 1}</h4><label>Date<input type="date" aria-label={`Day ${index + 1} date`} value={day.date} onChange={event => changeDay(index, "date", event.target.value)} /></label><label>Title<input aria-label={`Day ${index + 1} title`} value={day.title} onChange={event => changeDay(index, "title", event.target.value)} /></label><label>Objective<textarea aria-label={`Day ${index + 1} objective`} value={day.objective} onChange={event => changeDay(index, "objective", event.target.value)} /></label><label>Theme<textarea aria-label={`Day ${index + 1} theme`} value={day.theme} onChange={event => changeDay(index, "theme", event.target.value)} /></label><label>References · one per line<textarea aria-label={`Day ${index + 1} references`} value={day.references.join("\n")} onChange={event => changeDay(index, "references", event.target.value)} /></label></section>)}
              <button type="button" className="primary" disabled={!editable || (!!plan.questions.length && !resolved)} onClick={() => void command(`/${run.id}/plan`, { version: run.version, plan: { ...plan, questions: resolved ? [] : plan.questions } })}>Save direction changes</button>
            </fieldset></details>
</section>}{run&&<section className="workflow-content"><h3>Activity and usage</h3><p className="workflow-status" role="status">{run.state.replaceAll("_", " ")} · {run.tokensUsed.toLocaleString()} tokens used · {run.tokensReserved.toLocaleString()} reserved</p>          {run.jobs.length > 0 && <section aria-label="Workflow progress"><h3>Progress</h3><ul>{run.jobs.map(job => <li key={job.id}>{job.date ?? "Plan"} · {job.state.replaceAll("_", " ")}{job.usage ? ` · ${job.usage.inputTokens + job.usage.outputTokens} tokens` : ""}{job.error && <p>{job.error}</p>}</li>)}</ul></section>}
          {working && <button type="button" disabled={busy} onClick={() => void command(`/${run.id}/cancel`, { version: run.version })}>Cancel remaining work</button>}
          {(run.state === "failed" || run.state === "paused_conflict") && <button type="button" disabled={busy} onClick={() => void command(`/${run.id}/retry`, { version: run.version })}>{!run.plan?"Retry message":run.sequential?"Retry current day":"Retry failed days only"}</button>}
</section>}<section><h3>Privacy</h3><p>Private to you and this church. Saved conversations are available for 30 days.</p>{run&&<>          <details><summary>Delete private workflow content</summary><p>Removes private discussion, source copies and staged results. Already saved studies, numeric usage and retained audit/backup records remain.</p><label className="workflow-check"><input type="checkbox" checked={eraseConfirm} onChange={event => setEraseConfirm(event.target.checked)} /> Delete this workflow's private content</label><button type="button" disabled={busy || !eraseConfirm} onClick={() => void command(`/${run.id}/erase`, { confirmed: true }, true)}>Delete workflow content</button></details></>}</section></CowriterMenu><button type="button" className="cowriter-icon-button" aria-label={expanded ? "Restore planning panel size" : "Expand planning panel"} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "↙" : "↗"}</button><button ref={closeButton} type="button" className="cowriter-icon-button" aria-label="Close study planning" onClick={() => { setOpen(false); launcher.current?.focus(); }}>×</button></div></header>
      <div ref={chat} className="cowriter-chat workflow-content" onScroll={()=>{const node=chat.current;if(node)followLatest.current=node.scrollHeight-node.scrollTop-node.clientHeight<64;}}>
        {showConversation && !run && selected && <p role="status">Loading your saved workflow…</p>}
        {showConversation && run && <>
          
          {run.error && <p role="alert">{run.error}</p>}
          <div className="cowriter-messages" role="log" aria-label="Planning conversation history">{run.messages.map((message,index)=><div className={`cowriter-message ${message.role==='assistant'?'agent':'user'}`} key={index}><strong className="sr-only">{message.role==='user'?'You':'Study Co-writer'}</strong><p>{message.text}</p></div>)}</div>
          {run.mapping.length > 0 && <section aria-label="Created study drafts"><h3>{run.state==="drafts_saved"?"All study days saved":"Confirmed days saved"}</h3><p>Open each day to review its complete draft. Human final approval is still required.</p><ul>{run.mapping.map(day => <li key={day.slotId}><a href={`/studies?church=${data.church.id}&month=${day.date.slice(0, 7)}&slot=${day.slotId}`}>Open study for {day.date}</a></li>)}</ul></section>}
          {!run.plan&&!working&&run.messages.length>=4&&run.messages.some(message=>message.role==='user'&&/\d+:\d+/.test(message.text))&&<button type="button" className="primary" disabled={busy} onClick={()=>void command(`/${run.id}/prepare`,{version:run.version})}>Prepare the discussed study plan</button>}
          {run.plan && intentReview && <section className="workflow-confirmation" aria-label="Confirm request understanding"><h3>Have I understood your request?</h3><p>{run.plan.days.length} studies · week beginning {run.plan.weekStart} · {run.plan.theme}</p><p>Audience: {run.plan.direction.audience}. {run.plan.progression}</p><ul>{run.plan.days.map((day,index)=><li key={day.date}>Day {index+1}: {day.date} · {day.title}</li>)}</ul>{run.plan.assumptions.map((item,index)=><p key={index}>{item}</p>)}<p>Discuss any adjustments below. Confirming starts the review of day 1; it creates no study.</p>{run.conversationSource&&!run.sourceReviewed&&<><details><summary>Review the notes used from this conversation</summary><p className="cowriter-proposed-text">{run.sourceText}</p></details><label className="workflow-check"><input type="checkbox" checked={reviewConversationSource} onChange={event=>setReviewConversationSource(event.target.checked)} /> I reviewed these notes and have permission to use them as the study grounding.</label></>}<button type="button" className="primary" disabled={busy||!!working||run.plan.questions.length>0||(run.conversationSource&&!run.sourceReviewed&&!reviewConversationSource)} onClick={()=>void command(`/${run.id}/intent`,{version:run.version,planHash:run.planHash,confirmed:true,reviewedSource:reviewConversationSource})}>Confirm understanding of my request</button></section>}
          {run.plan && plan && !intentReview && <>
            {run.state!=="awaiting_generation_confirmation" && run.state!=="drafts_saved" && <section className="workflow-confirmation" aria-label="Proposed study day"><h3>Day {dayIndex+1}: {plan.days[dayIndex]?.title}</h3><p>{plan.days[dayIndex]?.date} · {plan.days[dayIndex]?.references.join(", ")}</p><p>{plan.days[dayIndex]?.objective}</p><p>Tell me what to adjust, or review this direction to continue. Detailed editing is available in the menu.</p><button className="primary" type="button" disabled={busy||!!working||!!plan.questions.length&&!resolved} onClick={()=>void command(`/${run.id}/plan`,{version:run.version,plan:{...plan,questions:resolved?[]:plan.questions}})}>{run.sequential?`Review day ${dayIndex+1} direction`:"Review agreed direction"}</button></section>}
            {run.state === "awaiting_generation_confirmation" && <section className="workflow-confirmation"><h3>{run.sequential?`Confirm creation of day ${dayIndex+1}`:"Confirm this draft set"}</h3><p>Assigned to {session.user.displayName}, {run.localTime} · {run.timeZone}.</p><ul>{run.plan.days.filter((_,index)=>!run.sequential||index===dayIndex).map(day => <li key={day.date}>{day.date} · {day.title}<p>{day.objective}</p><p>{day.references.join(", ")}</p></li>)}</ul><p>{run.sequential?"Only this day will be created. The next day waits for your separate review and confirmation.":"This older workflow saves the complete set together."} No final approval, publication or messages.</p><button className="primary" type="button" disabled={busy || dirtyPlan} onClick={() => void command(`/${run.id}/confirm`, { version: run.version, planHash: run.planHash, sourceHash: run.sourceHash, profileHash: run.profileHash, confirmed: true })}>{run.sequential?`Confirm & create day ${dayIndex+1}`:`Confirm direction & generate ${run.plan.days.length} drafts`}</button>{dirtyPlan && <p>Review your updated direction before confirming creation.</p>}</section>}
          </>}

        </>}
        {(busy||(showConversation&&working)) && <p className="cowriter-thinking" role="status">Co-writer is working…</p>}{error && <p role="alert">{error}</p>}
      </div>
      <form className="cowriter-composer" onSubmit={event=>{event.preventDefault();followLatest.current=true;if(showConversation&&run){if(reply.trim())void command(`/${run.id}/discuss`,{version:run.version,task:reply.trim()});}else sendInitialMessage();}}>
        <textarea ref={composer} aria-label="Message the planning co-writer" placeholder="Message your co-writer…" value={showConversation?reply:task} maxLength={2000} disabled={busy||!!(showConversation&&working)} onChange={event=>{if(showConversation)setReply(event.target.value);else setTask(event.target.value);}} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();event.currentTarget.form?.requestSubmit();}}} />
        <div><span /><button className="cowriter-send" type="submit" aria-label="Send planning message" disabled={busy||!!(showConversation&&(working||!run))||!(showConversation?reply:task).trim()}><CreatorIcon name="send" /></button></div>
      </form>
    </aside>
  </>, document.body);
}
