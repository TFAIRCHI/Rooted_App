"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { legacyMarketingFragments } from "../../lib/marketing";

export function LegacyMarketingLinks() {
  const router = useRouter();
  useEffect(() => {
    const forward = () => {
      const target = Object.hasOwn(legacyMarketingFragments, window.location.hash) ? legacyMarketingFragments[window.location.hash] : undefined;
      if (target) router.replace(target);
    };
    forward();
    window.addEventListener("hashchange", forward);
    return () => window.removeEventListener("hashchange", forward);
  }, [router]);
  return null;
}

// Read only a named public fragment; no account/query routing is involved.
function usePublicFragment(select: (hash: string) => void) {
  const selectRef = useRef(select);
  useEffect(() => { selectRef.current = select; });
  useEffect(() => {
    const sync = () => selectRef.current(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
}

const rhythms = {
  after: [["SUN", "Hear the message"], ["MON", "Return to the Word"], ["WED", "Go a little deeper"], ["FRI", "Bring it home"], ["SAT", "Live one next step"]],
  before: [["MON", "Meet the passage"], ["WED", "Find the context"], ["FRI", "Make it personal"], ["SAT", "Pray & anticipate"], ["SUN", "Hear it together"]],
};

export function WeekExample() {
  const [rhythm, setRhythm] = useState<"after" | "before">("after");
  usePublicFragment(hash => { if (hash === "#before-sunday") setRhythm("before"); else if (hash === "#after-sunday") setRhythm("after"); });
  return <div className="rhythm-card" id="example-week" tabIndex={-1}>
    <span className="fragment-target" id="before-sunday" /><span className="fragment-target" id="after-sunday" />
    <p className="eyebrow">AT YOUR CHURCH’S PACE</p><h2>Sunday is a beginning.</h2>
    <div className="choice-row" role="group" aria-label="Choose an example week"><button type="button" aria-pressed={rhythm === "after"} onClick={() => setRhythm("after")}>After Sunday</button><button type="button" aria-pressed={rhythm === "before"} onClick={() => setRhythm("before")}>Before Sunday</button></div>
    <div aria-live="polite"><ol className="week-list">{rhythms[rhythm].map(([day, text]) => <li key={day}><span>{day}</span><strong>{text}</strong></li>)}</ol></div>
    <p className="caption">Illustrative rhythm. Your team chooses the dates.</p>
  </div>;
}

const tours = {
  member: [
    { name: "Find this week", image: "member-home", title: "A familiar place to begin.", text: "The church’s reading space brings the week’s studies together. Members can find what’s available and choose their next moment in the Word." },
    { name: "Read & reflect", image: "member-study", title: "Room to read. A reason to return.", text: "Read the passage, reflect on your church’s teaching, and carry a practical response into the day." },
  ],
  team: [
    { name: "Workspace", image: "team-dashboard", title: "Know what needs your attention.", text: "See study preparation and the next piece of work in your church’s own workspace." },
    { name: "Review & share", image: "team-editor", title: "A clear path to publication.", text: "Edit the study, preview the member experience, and keep review and publication together." },
    { name: "Plan the week", image: "team-calendar", title: "Make space for a steady rhythm.", text: "Plan the study calendar and decide when each study is ready to share." },
  ],
};

export function MarketingTour() {
  const [view, setView] = useState<{ audience: "member" | "team"; step: number }>({ audience: "member", step: 0 });
  const steps = tours[view.audience];
  const current = steps[view.step];
  const image = `/showcase/${current.image}.webp`;
  return <section className="tour-layout" id="product-tour" tabIndex={-1}>
    <div className="tour-copy"><div className="choice-row" role="group" aria-label="Choose an audience">{([['member', 'For members'], ['team', 'For your team']] as const).map(([key, name]) => <button key={key} type="button" aria-pressed={view.audience === key} onClick={() => setView({ audience: key, step: 0 })}>{name}</button>)}</div>
      <div className="tour-steps" role="group" aria-label="Choose a product view">{steps.map((step, index) => <button key={step.image} type="button" aria-pressed={view.step === index} onClick={() => setView({ ...view, step: index })}>0{index + 1} {step.name}</button>)}</div>
      <div id="tour-description" aria-live="polite"><h2>{current.title}</h2><p>{current.text}</p></div><Link className="text-link" href="/sample-study">Read a sample study →</Link>
    </div>
    <figure className="product-screen"><div className="browser-bar"><span aria-hidden="true">● ● ●</span><span>{view.audience === "member" ? "Member experience" : "Church workspace"}</span></div>
      <a href={image} target="_blank" rel="noopener noreferrer"><Image key={current.image} src={image} alt={`Actual Rooted ${current.name.toLowerCase()} screen with fictional Grace Community Church demonstration data`} width={1360} height={960} loading="eager" sizes="(max-width:760px) calc(100vw - 40px), (max-width:1100px) 55vw, 670px" /><span className="image-expand">Open full-size screen ↗<span className="sr-only"> (opens in a new tab)</span></span></a>
      <figcaption>Actual application · Fictional demonstration church</figcaption>
    </figure>
  </section>;
}

const prompts = {
  simple: { request: "Help us prepare four studies on John 15:1–8 for next week. Focus on remaining in Christ.", response: "Which audience and dates do you have in mind? What would you like readers to carry into their week?", plan: "Read the passage · Explore the context · Reflect together · Put it into practice" },
  notes: { request: "Our sermon notes focus on abiding in Christ rather than striving alone. Help us carry that theme into the week.", response: "What should readers take away from these notes, and which audience and dates should we plan for?", plan: "Stay connected · Depend on Christ · Share the fruit · Take one faithful step" },
};

export function CowriterExample() {
  const [prompt, setPrompt] = useState<keyof typeof prompts>("simple");
  usePublicFragment(hash => { if (hash === "#sermon-notes") setPrompt("notes"); else if (hash === "#simple-request") setPrompt("simple"); });
  const current = prompts[prompt];
  return <div className="conversation" id="example-co-writer" tabIndex={-1}>
    <span className="fragment-target" id="simple-request" /><span className="fragment-target" id="sermon-notes" />
    <div className="conversation-head"><svg viewBox="0 0 32 36" aria-hidden="true"><path d="M16 34V17C4 17 2 7 2 7c12-2 14 10 14 10C16 5 25 1 30 2c0 12-14 15-14 15" fill="currentColor" /></svg><div><strong>Rooted co-writer</strong><span>Illustrative conversation</span></div></div>
    <div className="conversation-body"><div className="choice-row" role="group" aria-label="Choose an example request"><button type="button" aria-pressed={prompt === "simple"} onClick={() => setPrompt("simple")}>Simple request</button><button type="button" aria-pressed={prompt === "notes"} onClick={() => setPrompt("notes")}>With sermon notes</button></div>
      <div aria-live="polite"><p className="chat-request">{current.request}</p><div className="chat-response">{current.response}<small className="plan-label">EXAMPLE PLAN · AFTER AGREEING ON THE DIRECTION</small><strong>{current.plan}</strong><p>Confirm each day before it becomes a saved draft.</p></div></div>
    </div>
  </div>;
}

export function TrustQuestion() {
  const details = useRef<HTMLDetailsElement>(null);
  usePublicFragment(hash => { if (hash === "#trust" && details.current) details.current.open = true; });
  return <details ref={details} id="trust"><summary>Who decides what members see?<span aria-hidden="true">+</span></summary><p>Your church’s authorized team manages review and publication. An AI draft is not automatically a published study. Your church’s workspace and member experience remain distinct from other churches.</p></details>;
}

export function DifferenceDetails({ children }: { children: ReactNode }) {
  const details = useRef<HTMLDetailsElement>(null);
  usePublicFragment(hash => { if (hash === "#rooted-difference" && details.current) details.current.open = true; });
  return <details className="difference-details" id="rooted-difference" ref={details}><summary>What makes Rooted different?<span aria-hidden="true">+</span></summary>{children}</details>;
}
