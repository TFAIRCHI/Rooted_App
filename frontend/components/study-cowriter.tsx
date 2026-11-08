"use client";
import { useEffect, useId, useRef, useState } from "react";
import { CowriterMenu } from "./cowriter-menu";
import { createPortal } from "react-dom";
import { CreatorIcon, type IconName } from "./creator-icons";
import { api, type Session } from "../lib/api";
import type { Aggregate } from "../lib/types";
type Proposal = { fields: { path: string; suggestion: string; warnings: string[]; scriptureReferences: string[] }[] };
type Result = { id: string; status: string; error: string | null; result: { text: string; proposal?: Proposal; usage: { inputTokens: number; outputTokens: number } } | null };
const actions: { icon: IconName; label: string; hint: string; kind: "chat" | "weekly" | "draft" | "clip"; prompt: string }[] = [
  { icon: "file", label: "Read sermon transcript", hint: "Paste or attach a text transcript", kind: "chat", prompt: "Identify the central theme and supporting passage references in my reviewed sermon transcript. Ask a focused question if context is missing." },
  { icon: "video", label: "Examine sermon clip", hint: "Transcript analysis available", kind: "clip", prompt: "" },
  { icon: "calendar", label: "Build the weekly plan", hint: "Read-only outline for selected dates", kind: "weekly", prompt: "Build a concise weekly outline from the reviewed sermon for the selected dates." },
  { icon: "sparkles", label: "Write today’s study", hint: "Create a proposal for review", kind: "draft", prompt: "Write a concise devotional study for the selected day, grounded in the reviewed sermon." },
];
export function StudyCowriter({ date, title, active = true, churchId, study, session, unsaved, onAdopt, prepare }: {
  date: string; title: string; active?: boolean; churchId: string; study: Aggregate; session: Session; unsaved: boolean;
  onAdopt: (study: Aggregate) => void; prepare: () => Aggregate;
}) {
  const [mounted, setMounted] = useState(false), [open, setOpen] = useState(false), [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false), [menuOpen, setMenuOpen] = useState(false), [dragging, setDragging] = useState(false);
  const [kind, setKind] = useState<"chat" | "weekly" | "draft">("chat");
  const [conversationId, setConversationId] = useState("");
  const [conversations, setConversations] = useState<{id:string;title:string;created_at:string}[]>([]);
  const [messages, setMessages] = useState<{ role: "user" | "agent"; text: string }[]>([]);
  const [sourceText, setSourceText] = useState(""), [sourceName, setSourceName] = useState("");
  const [sourceConfirmed, setSourceConfirmed] = useState(false), [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(""), [error, setError] = useState("");
  const [configured, setConfigured] = useState(false), [verified, setVerified] = useState(false);
  const [proposal, setProposal] = useState<Result | null>(null), [usage, setUsage] = useState("");
  const panelId = useId(), launcher = useRef<HTMLButtonElement>(null), closeButton = useRef<HTMLButtonElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null), fileInput = useRef<HTMLInputElement>(null), chat = useRef<HTMLDivElement>(null);
  const alive = useRef(true), sending = useRef(false), attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const prefix = `/churches/${churchId}/content/${study.id}/cowriter`;
  useEffect(() => { setMounted(true); alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!open || !active) return;
    closeButton.current?.focus(); let current = true;
    api<{ configured: boolean; message?: string }>(prefix + "/status").then(({ data }) => { if (current) { setConfigured(data.configured); if (!data.configured) setError(data.message ?? "Co-writer unavailable."); } }).catch(failure => { if (current) setError(failure instanceof Error ? failure.message : "Could not check the co-writer."); });
    api<{items:{id:string;title:string;created_at:string}[]}>(prefix + "/conversations").then(({data})=>{if(current)setConversations(data.items ?? []);}).catch(failureMessage);
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { event.preventDefault(); setOpen(false); requestAnimationFrame(() => launcher.current?.focus()); } }
    document.addEventListener("keydown", escape);
    return () => { current = false; document.removeEventListener("keydown", escape); };
  }, [open, active, prefix]);
  useEffect(() => { chat.current?.scrollTo({ top: chat.current.scrollHeight, behavior: "auto" }); }, [messages, busy, proposal]);
  const churchName = session.churches.find(church => church.id === churchId)?.name ?? "Selected church";
  async function ensureConversation(fresh = false) {
    if (conversationId && !fresh) return conversationId;
    const { data } = await api<{ id: string }>(prefix + "/conversations", { method: "POST", csrf: session.csrfToken, body: {} });
    if (alive.current) { setConversationId(data.id); setConversations(items=>[{id:data.id,title:"New conversation",created_at:new Date().toISOString()},...items]); } return data.id;
  }
  async function resumeConversation(value:string) {
    if(sending.current)return;setMenuOpen(false);setNotice("");setError("");setProposal(null);setInput("");attempt.current=null;
    if(!value){setConversationId("");setMessages([]);setSourceText("");setSourceConfirmed(false);setRightsConfirmed(false);return;}
    sending.current=true;setBusy(true);
    try { const {data}=await api<{id:string;messages:{role:string;content:string}[];sourceText:string;sourceConfirmed:boolean}>(prefix+"/conversations/"+value);
      if(alive.current){setConversationId(data.id);setMessages(data.messages.map(message=>({role:message.role==="user"?"user":"agent",text:message.content})));setSourceText(data.sourceText);setSourceName("");setSourceConfirmed(data.sourceConfirmed);setRightsConfirmed(data.sourceConfirmed);setNotice("Conversation restored. Continue where you left off.");}
    }catch(failure){failureMessage(failure);}finally{sending.current=false;if(alive.current)setBusy(false);}
  }
  function failureMessage(failure: unknown) { if (alive.current) setError(failure instanceof Error ? failure.message : "The request failed. Your saved study has not changed."); }
  async function confirmSource() {
    if (sending.current) return; sending.current = true; setBusy(true); setError("");
    try {
      const id = await ensureConversation(!!conversationId);
      await api(prefix + "/sources", { method: "POST", csrf: session.csrfToken, body: { conversationId: id, text: sourceText, confirmed: true, rightsConfirmed: true, ...(sourceName ? { filename: sourceName } : {}) } });
      if (alive.current) { setMenuOpen(false); setSourceConfirmed(true); setProposal(null); setMessages([]); setNotice("Transcript confirmed in this private conversation. Earlier conversations remain in history. No AI request has been sent."); }
    } catch (failure) { failureMessage(failure); } finally { sending.current = false; if (alive.current) setBusy(false); }
  }
  async function clear() {
    if (sending.current) return; sending.current = true; setBusy(true); setError("");
    try {
      if (conversationId) await api(prefix + `/conversations/${conversationId}`, { method: "DELETE", csrf: session.csrfToken });
      if (alive.current) { setConversations(items=>items.filter(item=>item.id!==conversationId)); setConversationId(""); setMessages([]); setSourceText(""); setSourceName(""); setSourceConfirmed(false); setRightsConfirmed(false); setProposal(null); setUsage(""); setInput(""); attempt.current = null; setNotice("Private conversation and transcript cleared. Usage accounting is retained."); }
    } catch (failure) { failureMessage(failure); } finally { sending.current = false; if (alive.current) setBusy(false); }
  }
  async function send() {
    if (!input.trim() || sending.current) return; sending.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const current = prepare();
      if (sourceText.trim() && !sourceConfirmed) throw new Error("Confirm the transcript you are reviewing before sending a request.");
      if (kind !== "chat" && !sourceConfirmed) throw new Error("Add and confirm sermon text before planning or drafting.");
      const id = await ensureConversation(), body = { conversationId: id, kind, task: input.trim(), baseRevisionId: current.headRevisionId }, fingerprint = JSON.stringify(body);
      if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
      const { data } = await api<Result>(prefix + "/messages", { method: "POST", csrf: session.csrfToken, key: attempt.current.key, body });
      if (!alive.current) return;
      if (data.status === "running") { setNotice("The original request is still running. Try again to check the same request; no duplicate model request will be sent."); return; }
      attempt.current = null;
      if (data.status !== "completed" || !data.result) throw new Error(data.error ?? "The model could not complete this request. You may retry explicitly.");
      setMessages(current => [...current, { role: "user", text: input.trim() }, { role: "agent", text: data.result!.text }]);
      setUsage(`${data.result.usage.inputTokens} input / ${data.result.usage.outputTokens} output tokens`);
      setConversations(items=>items.map(item=>item.id===id&&item.title==="New conversation"?{...item,title:input.trim()}:item));
      setVerified(true); setProposal(data.result.proposal ? data : null); setInput(""); setKind("chat");
    } catch (failure) { failureMessage(failure); } finally { sending.current = false; if (alive.current) setBusy(false); }
  }
  async function adopt() {
    if (!proposal || sending.current) return; sending.current = true; setBusy(true); setError("");
    try {
      const current = prepare();
      const { data } = await api<Aggregate>(prefix + `/requests/${proposal.id}/adopt`, { method: "POST", csrf: session.csrfToken, etag: current.etag, body: { confirmedReplacement: true } });
      if (alive.current) { onAdopt(data); setProposal(null); setNotice("Proposal adopted as a new saved draft revision. Approval and publication still require human action."); }
    } catch (failure) { failureMessage(failure); } finally { sending.current = false; if (alive.current) setBusy(false); }
  }
  async function chooseFile(file: File | undefined) {
    if (!file || sending.current) return;
    if (file.size > 10 * 1024 * 1024) { setError("Attach a Word document or PDF up to 10 MB."); return; }
    sending.current = true; setBusy(true); setError(""); setNotice("");
    const extension = file.name.toLowerCase().split(".").pop();
    try {
      let text = "";
      if (extension === "pdf" || file.type === "application/pdf") {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        const pages: string[] = [];
        for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
          const page = await document.getPage(pageNumber), content = await page.getTextContent();
          pages.push(content.items.map(item => "str" in item ? item.str : "").join(" "));
        }
        text = pages.join("\n\n");
      } else if (extension === "docx") {
        const mammoth = await import("mammoth");
        text = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
      } else { setError("Choose a .docx Word document or PDF file up to 10 MB."); return; }
      if (!text.trim()) throw new Error("No selectable text was found in this document.");
      if (new TextEncoder().encode(text).length > 6*1024*1024) throw new Error("The extracted text exceeds 6 MB. Use a shorter document.");
      const filename = file.name.length <= 200 ? file.name : file.name.slice(-200), id = await ensureConversation(!!conversationId);
      await api(prefix + "/sources", { method: "POST", csrf: session.csrfToken, body: { conversationId: id, text, confirmed: true, rightsConfirmed: true, filename } });
      if (alive.current) { setSourceText(text); setSourceName(filename); setSourceConfirmed(true); setRightsConfirmed(true); setProposal(null); setMessages([]); setMenuOpen(true); setNotice(`${file.name} was added as context. You can start the Co-writer discussion.`); }
    } catch (failure) { failureMessage(failure); }
    finally { sending.current = false; if (alive.current) setBusy(false); }
  }
  if (!mounted || !active) return null;
  return createPortal(<>
    <button ref={launcher} type="button" className="cowriter-launcher" hidden={open} aria-label="Open study co-writer" aria-expanded={open} aria-controls={panelId} onClick={() => { setMenuOpen(false); setOpen(true); }}><CreatorIcon name="sparkles" size={26} /></button>
    <aside id={panelId} className={`study-cowriter cowriter-popup${expanded ? " cowriter-expanded" : ""}`} role="dialog" aria-label="Study co-writer" hidden={!open}>
      <header className="cowriter-header"><div className="cowriter-identity"><span><CreatorIcon name="sparkles" /></span><div><h2>Study Co-writer</h2><p><i />{verified ? "Connected · Azure" : configured ? "Configured · Ready to try" : "Checking configuration"}</p></div></div><div className="cowriter-header-actions"><CowriterMenu open={menuOpen} onOpenChange={setMenuOpen}><section><h3>Conversations</h3>        <div className="workflow-toolbar"><label>Previous conversations<select aria-label="Previous study conversations" disabled={busy} value={conversationId} onChange={event=>void resumeConversation(event.target.value)}><option value="">New conversation</option>{conversations.map(item=><option key={item.id} value={item.id}>{item.title.slice(0,70)} · {new Date(item.created_at).toLocaleDateString()}</option>)}</select></label><button type="button" disabled={busy} onClick={()=>void resumeConversation("")}>New conversation</button></div>
</section><section><h3>Study tools</h3>        {session.churches.find(church => church.id === churchId)?.capabilities.includes("series:manage") && <button type="button" className="cowriter-plan-entry" onClick={() => { setOpen(false); window.dispatchEvent(new Event("rooted:plan-studies")); }}>Plan studies · create a multi-day draft set</button>}
        <div className="cowriter-quick"><p>What would you like to do?</p><div>{actions.map(action => <button type="button" key={action.label} disabled={busy} onClick={() => { if (action.kind === "clip") { setMenuOpen(false); setNotice("Audio and video processing are not connected. Paste or upload a transcript for text analysis."); return; } setMenuOpen(false); setKind(action.kind); setInput(action.prompt); composer.current?.focus(); }}><span><CreatorIcon name={action.icon} /></span><div><strong>{action.label}</strong><small>{action.hint}</small></div><CreatorIcon name="chevron" size={14} /></button>)}</div></div>
        <label className="sr-only" htmlFor={`${panelId}-mode`}>Co-writer action</label><select id={`${panelId}-mode`} value={kind} disabled={busy} onChange={event => setKind(event.target.value as typeof kind)}><option value="chat">Ask or expand notes</option><option value="weekly">Weekly outline · read only</option><option value="draft">Selected-day draft proposal</option></select></section><section><h3>Sources</h3>        <details className="cowriter-source"><summary>Study document {sourceConfirmed ? "· Confirmed" : "· Add or review"}</summary><label>Review extracted text<textarea aria-label="Study document text" value={sourceText} disabled={busy} maxLength={6*1024*1024} onChange={event => { setSourceText(event.target.value); setSourceName(""); setSourceConfirmed(false); setRightsConfirmed(false); }} placeholder="Paste notes or drop a Word document or PDF into the Co-writer" /></label><button type="button" disabled={busy} onClick={() => fileInput.current?.click()}>Attach Word or PDF</button><small>Accepted: .docx and PDF, up to 10 MB.</small><label><input type="checkbox" checked={rightsConfirmed} disabled={busy} onChange={event => setRightsConfirmed(event.target.checked)} /> I reviewed this text and have permission to use it.</label><button type="button" disabled={busy || !sourceText.trim() || !rightsConfirmed || sourceConfirmed} onClick={() => void confirmSource()}>{sourceConfirmed ? "Document confirmed" : "Confirm document"}</button></details>
</section><section><h3>Current study</h3>      <div className="cowriter-context"><span>{churchName} · Private conversation</span><strong>{date} · {title || "Untitled study"}</strong><small>Church profile if configured; otherwise demo teaching profile</small></div>
</section><section><h3>Privacy</h3><button type="button" aria-label="Clear co-writer conversation" disabled={busy} onClick={() => { setMenuOpen(false); void clear(); }}>Delete current conversation</button><p>Private to you and this church. Conversations are available for 7 days.</p></section></CowriterMenu><button type="button" className="cowriter-icon-button" aria-label={expanded ? "Restore co-writer size" : "Expand study co-writer"} title={expanded ? "Restore original size" : "Expand for easier reading"} aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded(current => !current)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{expanded ? <path d="M4 10h6V4m10 10h-6v6M10 10 4 4m10 10 6 6" /> : <path d="M4 10V4h6m10 10v6h-6M4 4l6 6m10 10-6-6" />}</svg></button><button ref={closeButton} type="button" className="cowriter-icon-button" aria-label="Close study co-writer" onClick={() => { setOpen(false); requestAnimationFrame(() => launcher.current?.focus()); }}>×</button></div></header>
      <div ref={chat} className={`cowriter-chat${dragging ? " cowriter-drop-active" : ""}`} onDragEnter={event => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); setDragging(true); } }} onDragOver={event => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={event => { event.preventDefault(); setDragging(false); void chooseFile(event.dataTransfer.files[0]); }}>
        {dragging && <div className="cowriter-drop-overlay">Drop a Word document or PDF to add it as context</div>}
        <div className="cowriter-messages" role="log" aria-label="Co-writer conversation">{messages.map((message, index) => <div className={`cowriter-message ${message.role}`} key={index}>{message.role === "agent" && <span className="cowriter-mini"><CreatorIcon name="sparkles" size={14} /></span>}<p>{message.text}</p></div>)}</div>
        {proposal?.result?.proposal && <section className="cowriter-proposal" aria-label="Study draft proposal"><h3>Review proposed changes</h3><p>Your saved study has not changed. Adopting replaces the fields below.</p>{proposal.result.proposal.fields.map(field => <details key={field.path}><summary>{field.path}</summary><p className="cowriter-proposed-text">{field.suggestion}</p>{field.scriptureReferences.length > 0 && <small>Suggested references for verification: {field.scriptureReferences.join(", ")}</small>}{field.warnings.map((warning, i) => <p key={i}>{warning}</p>)}</details>)}<button type="button" disabled={busy || unsaved} onClick={() => void adopt()}>Adopt proposal into saved draft</button>{unsaved && <p>Save or discard your editor changes before adopting.</p>}</section>}
        {busy && <p role="status">Working… Your saved study stays unchanged until adoption.</p>}
      </div>
      <form className="cowriter-composer" onSubmit={event => { event.preventDefault(); void send(); }}>

        <textarea ref={composer} value={input} maxLength={2000} disabled={busy} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} placeholder="Ask your co-writer anything…" aria-label="Message the study co-writer" />
        <div><span><button type="button" disabled={busy} aria-label="Attach a transcript or sermon clip" onClick={() => setMenuOpen(true)}><CreatorIcon name="paperclip" /></button></span><button type="submit" className="cowriter-send" disabled={busy || !configured || !input.trim() || unsaved} aria-label="Send message"><CreatorIcon name="send" /></button></div>
        <input ref={fileInput} type="file" className="sr-only" aria-label="Co-writer source file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,application/pdf" onChange={event => { void chooseFile(event.target.files?.[0]); event.target.value = ""; }} />
        {usage && <small>{usage}</small>}{unsaved && <p role="status">Save your editor changes before sending a request.</p>}{notice && <p className="cowriter-notice" role="status">{notice}</p>}{error && <p className="cowriter-notice" role="alert">{error} Your message is retained; use Send to retry.</p>}
      </form>
    </aside>
  </>, document.body);
}
