"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { ContentDraft } from "../lib/content";

type PreviewMode = "member" | "message";

export function MemberPhonePreview({ draft, churchName, logoUrl }: { draft: ContentDraft; churchName: string; logoUrl?: string | null }) {
  const [mode, setMode] = useState<PreviewMode>("member");
  const [expanded, setExpanded] = useState(true);
  const previewId = useId();
  const memberTab = useRef<HTMLButtonElement>(null); const messageTab = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (window.matchMedia?.("(max-width:760px)").matches) setExpanded(false); }, []);
  function switchTab(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "member" : event.key === "End" ? "message" : mode === "member" ? "message" : "member";
    setMode(next); (next === "member" ? memberTab : messageTab).current?.focus();
  }
  const title = draft.title || "Your study title";
  const passage = draft.referencesText?.split("\n").map(value => value.trim()).find(Boolean) || "Primary Scripture";
  const message = draft.outboundPreview || `${title} · Read this week's study with ${churchName}.`;

  return <aside className="live-preview-panel" aria-label="Live member preview">
    <div className="live-preview-heading"><div><p className="eyebrow">Live preview</p><h2>See the member view</h2></div><span className="preview-draft-status">Draft only</span></div>
    <button className="text-button" aria-expanded={expanded} aria-controls={previewId} onClick={() => setExpanded(!expanded)}>{expanded ? "Hide phone preview" : "Show phone preview"}</button>
    <div id={previewId} hidden={!expanded}>
    <div className="preview-tabs" role="tablist" aria-label="Preview type">
      <button ref={memberTab} id={`${previewId}-member-tab`} aria-controls={`${previewId}-panel`} role="tab" tabIndex={mode === "member" ? 0 : -1} aria-selected={mode === "member"} className={mode === "member" ? "active" : ""} onKeyDown={switchTab} onClick={() => setMode("member")}>Member view</button>
      <button ref={messageTab} id={`${previewId}-message-tab`} aria-controls={`${previewId}-panel`} role="tab" tabIndex={mode === "message" ? 0 : -1} aria-selected={mode === "message"} className={mode === "message" ? "active" : ""} onKeyDown={switchTab} onClick={() => setMode("message")}>Message view</button>
    </div>
    <div id={`${previewId}-panel`} role="tabpanel" aria-labelledby={`${previewId}-${mode}-tab`} tabIndex={0} className="iphone-frame" style={{ position: "relative" }}>
      <div className="iphone-speaker" aria-hidden="true" />
      <div className="iphone-screen">
        <div className="iphone-status-bar"><span>9:41</span><span aria-hidden="true">● ● ▰</span></div>
        <div className="iphone-member-header">{logoUrl ? <img src={logoUrl} alt="" /> : <span className="iphone-logo-fallback">R</span>}<div><strong>{churchName}</strong><small>Growing Deeper Together</small></div></div>
        {mode === "member" ? <article className="iphone-study">
          <small className="iphone-kicker">This week · {passage}</small>
          <h3>{title}</h3>
          <section><strong>Read</strong><p>{draft.body || "Your study body will appear here as you write."}</p></section>
          <section><strong>Reflect</strong><p>{draft.reflection || "Add a reflection to help members slow down and notice."}</p></section>
          <section><strong>Discuss</strong><p>{draft.discussionQuestion || "Add a question members can answer together."}</p></section>
          <section><strong>Practice</strong><p>{draft.application || "Add one simple step for the week."}</p></section>
        </article> : <div className="iphone-message"><small>SMS preview</small><div className="iphone-message-bubble">{message}</div><span>Rooted link will be added when published.</span></div>}
        <div className="iphone-home-indicator" aria-hidden="true" />
      </div>
    </div>
    <p className="fine live-preview-note">Previewing your draft. It is not published or sent.</p>
    </div>
  </aside>;
}
