"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Publication } from "../lib/member-server";
import type { Session } from "../lib/api";
import { StudyAudio } from "./study-audio";
import { MemberActions } from "./member-conversation";

export function completionKey(churchId: string, userId: string, studyId: string) {
  return `rooted:completed:${churchId}:${userId}:${studyId}`;
}

export function StudyCompletionLabel({ churchId, userId, studyId }: { churchId: string; userId: string; studyId: string }) {
  const [completed, setCompleted] = useState(false);
  useEffect(() => {
    try { setCompleted(localStorage.getItem(completionKey(churchId, userId, studyId)) === "true"); } catch { /* Reading is still available when storage is blocked. */ }
  }, [churchId, userId, studyId]);
  return <span>{completed ? "Completed" : "Read this study →"}</span>;
}

function Mark({ className }: { className: string }) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 100 100" fill="none"><path d="M50 5V95M5 50H95M18 18L82 82M82 18L18 82" /></svg>;
}

export function MemberStudyReader({ study, slug, userId, session = null, preview = false }: { study: Publication; slug: string; userId: string; session?: Session | null; preview?: boolean }) {
  const [activeSection, setActiveSection] = useState("begin");
  const [completed, setCompleted] = useState(false);
  const [storageError, setStorageError] = useState("");
  const key = completionKey(study.churchId, userId, study.id);
  useEffect(() => {
    try { setCompleted(localStorage.getItem(key) === "true"); } catch { /* Storage is optional for reading. */ }
  }, [key]);
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-study-section]"));
    const observer = new IntersectionObserver(entries => {
      const visible = entries.find(entry => entry.isIntersecting);
      if (visible) setActiveSection(visible.target.id);
    }, { rootMargin: "-25% 0px -60% 0px" });
    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  const { payload } = study;
  const bodyParagraphs = payload.body.split(/\n\s*\n/).filter(Boolean);
  const scriptureReference = payload.references?.join(" · ") || bodyParagraphs.find(text => /^Scripture:/i.test(text))?.replace(/^Scripture:\s*/i, "") || "";
  const subtitle = bodyParagraphs.find(text => /^Focus:/i.test(text))?.replace(/^Focus:\s*/i, "") || "Read, reflect, and carry truth into the week.";
  const bodyReflection = bodyParagraphs.filter(text => !/^(Scripture|Focus):/i.test(text)).join("\n\n");
  const reflectionParts = payload.reflection.split(/\n\s*\n/);
  const prayer = reflectionParts.find(text => /^Prayer:/i.test(text))?.replace(/^Prayer:\s*/i, "") || "Jesus, when everything around me feels uncertain, remind me that your words remain. Teach me to notice your faithfulness, to receive today with gratitude, and to place my hope in you. Amen.";
  const reflection = reflectionParts.filter(text => !/^Prayer:/i.test(text)).join("\n\n");
  // This passage is supplied in the Figma reference; show it only for the matching study passage.
  const scripture = /John 6:68[–-]69/.test(scriptureReference) ? "“Simon Peter answered him, ‘Lord, to whom shall we go? You have the words of eternal life. We have come to believe and to know that you are the Holy One of God.’”" : scriptureReference || "Read the passage your church has shared, and notice the words that stay with you.";
  const minutes = Math.max(1, Math.ceil([payload.body, payload.reflection, payload.discussionQuestion, payload.application].join(" ").split(/\s+/).length / 200));
  const paragraphs = (text: string) => text.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p className="reading-copy" key={index}>{paragraph}</p>);
  const sections = [["begin", "Begin"], ["scripture", "Scripture"], ["reflection", "Reflection"], ["questions", "Consider"], ["prayer", "Prayer"]];
  const audioText = [payload.title, subtitle, "Begin in stillness.", "Before you read, take a breath. Set down the unfinished work of the day. Ask God to make you attentive to the words you need.", "Today’s scripture.", scriptureReference, scripture === scriptureReference ? "" : scripture, "Reflection.", bodyReflection, reflection, "Pause and consider.", payload.discussionQuestion, "Put it into practice.", payload.application, "A prayer to carry.", prayer].filter(Boolean).join("\n\n");
  return <main id="main" className="study-page">
    <section className="study-hero"><div className="study-hero-inner">
      <Link className="back-button" href={`/c/${encodeURIComponent(slug)}${preview ? "?preview=figma" : ""}`}><svg aria-hidden="true" className="arrow-left" viewBox="0 0 24 24" fill="none"><path d="M5 12H19M14 7L19 12L14 17" /></svg>This week’s studies</Link>
      <div className="study-title-row"><div><p className="eyebrow mint">Published study · {new Date(study.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/New_York" })}</p><h1>{payload.title}</h1><p className="study-subtitle">{subtitle}</p></div>
        <div className="reading-time"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M4 5.5C6.8 4.3 9.5 4.8 12 7v12c-2.5-2.2-5.2-2.7-8-1.5v-12ZM20 5.5c-2.8-1.2-5.5-.7-8 1.5v12c2.5-2.2 5.2-2.7 8-1.5v-12Z" /></svg><span>Take your time<strong>{minutes} minute read</strong></span></div>
      </div><StudyAudio text={audioText} studyId={study.id} /></div><div className="study-progress" />
    </section>
    <div className="study-layout"><aside className="study-aside"><p>In this study</p><nav aria-label="Study sections">{sections.map(([id, label], index) => <button type="button" key={id} className={activeSection === id ? "active" : ""} aria-current={activeSection === id ? "location" : undefined} onClick={() => { setActiveSection(id); document.getElementById(id)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); }}><span>{String(index + 1).padStart(2, "0")}</span>{label}</button>)}</nav></aside>
      <article className="study-article">
        <section id="begin" data-study-section><p className="chapter-label">Begin in stillness</p><p className="opening-copy">Before you read, take a breath. Set down the unfinished work of the day. Ask God to make you attentive to the words you need.</p></section>
        <section id="scripture" className="scripture-card" data-study-section><div className="scripture-heading"><p>Today’s scripture</p><span>{scriptureReference || "Read with your church"}</span></div><blockquote>{scripture}</blockquote></section>
        <section id="reflection" data-study-section><p className="chapter-label">The words that remain</p><h2>Where we place our hope shapes how we live.</h2>{paragraphs(bodyReflection)}{paragraphs(reflection)}</section>
        <section id="questions" className="questions-card" data-study-section><p className="chapter-label">Pause and consider</p><h2>Make space for an honest answer.</h2><ol>{payload.discussionQuestion.split(/\n\s*\n/).filter(Boolean).map((question, index) => <li key={index}><span>{String(index + 1).padStart(2, "0")}</span><p>{question}</p></li>)}</ol></section>
        <section className="application-section"><p className="chapter-label">For the week ahead</p><h2>Put it into practice.</h2>{paragraphs(payload.application)}</section>
        <section id="prayer" className="prayer-section" data-study-section><Mark className="prayer-mark" /><p className="chapter-label">A prayer to carry</p><blockquote>{prayer}</blockquote></section>
        <div className="study-finish"><div><p className="eyebrow">For the week ahead</p><h2 aria-live="polite">{completed ? "Study completed." : "Carry it with you."}</h2><p>{completed ? "Come back whenever you need to revisit this reflection." : "Mark this study complete when you’re ready."}</p>{storageError && <p role="status">{storageError}</p>}</div><button type="button" className={completed ? "complete-button done" : "complete-button"} aria-pressed={completed} onClick={() => { const next = !completed; setCompleted(next); try { localStorage.setItem(key, String(next)); setStorageError(""); } catch { setStorageError("Your completion is saved for this visit only."); } }}><span className="check">{completed ? "✓" : ""}</span>{completed ? "Completed" : "Mark as complete"}</button></div>
        {!preview && <div className="study-community"><MemberActions key={`${study.churchId}:${study.id}:${session?.user.id ?? "guest"}`} publicationId={study.id} churchId={study.churchId} session={session} slug={slug} /></div>}
      </article>
    </div>
  </main>;
}
