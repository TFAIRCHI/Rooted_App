import Link from "next/link";
import type { ReactNode } from "react";
import { MarketingAction, MarketingFrame, MarketingIntro } from "./marketing-frame";
import { CowriterExample, DifferenceDetails, LegacyMarketingLinks, MarketingTour, TrustQuestion, WeekExample } from "./marketing-interactions";

function Page({ children }: { children: ReactNode }) { return <MarketingFrame><main id="main" className="wrap" tabIndex={-1}>{children}</main></MarketingFrame>; }

function SermonToPhone() {
  return <div className="hero-art" role="img" aria-label="A Sunday message becomes four short moments in Scripture through the week. Illustrative church content.">
    <div className="art-halo" /><div className="art-orbit" /><div className="sunburst" aria-hidden="true">☼</div>
    <div className="sermon-book"><svg className="book-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M6 29V14l10-8 10 8v15ZM12 29V19h8v10M16 6V1m-4 3h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg><small>IT STARTS ON SUNDAY</small><p>A message<br />worth living<br />all week.</p><span>Your pastor. Your church.<br />A shared direction.</span><div className="book-note">From the pew<br />to the everyday.</div></div>
    <div className="phone"><div className="phone-speaker" /><small>HARBOR CHURCH · ROOTED</small><p>A little time.<br />Deeper roots.</p>{[["MON", "Remain in Him", "John 15:1–8"], ["WED", "Room to grow", "Explore the passage"], ["FRI", "At your table", "Reflect together"], ["SAT", "One next step", "Put it into practice"]].map(([day, title, text]) => <div className="phone-day" key={day}><b>{day}</b><span>{title}<small>{text}</small></span></div>)}<span className="phone-foot">YOUR WEEK IN THE WORD</span></div>
  </div>;
}

export function MarketingHome() {
  return <Page><LegacyMarketingLinks /><section className="home-grid"><div className="hero-copy"><p className="eyebrow">YOUR SERMON. THEIR EVERYDAY.</p><h1>Let Sunday<br />take root.<br /><em>All week long.</em></h1><p className="lede">Turn your church’s teaching into weekday Bible studies, with an AI co-writer to help plan and draft. Your team reviews. Your people grow in Scripture.</p><div className="actions"><MarketingAction href="/get-started">Get started with your church</MarketingAction><Link className="text-link" href="/how-it-works">See how it works →</Link></div><p className="subtle">Here to read? <Link href="/find-church">Find your church →</Link></p></div><SermonToPhone /></section>
    <aside className="home-trail" aria-label="Explore Rooted"><span>A little time.<br /><em>A shared direction.</em></span>{[["THE PURPOSE", "Why Rooted", "/why-rooted"], ["THE EXPERIENCE", "Take a look inside", "/how-it-works"], ["THE RHYTHM", "Why four days?", "/power-of-four"]].map(([label, text, href]) => <Link key={href} href={href}><small>{label}</small>{text}<span aria-hidden="true">↗</span></Link>)}</aside>
  </Page>;
}

export function WhyRooted() {
  return <Page><MarketingIntro eyebrow="A SHARED DIRECTION" title={<>More room for<br />the message to grow.</>}>Keep the teaching your church already shares connected to the life your people actually live.</MarketingIntro><a className="text-link page-shortcut" href="#example-week">See an example week ↓</a>
    <section className="why-layout"><div className="outcomes">{[
      ["Stay connected beyond Sunday.", "Go further in what you heard through Scripture, reflection, and a practical response to carry into the day."],
      ["Prepare hearts for what’s next.", "Use an upcoming teaching outline to help your people meet the passage before gathering together."],
      ["Bring the message home.", "Make room for conversation around the table, on the drive, or in a quiet moment of your own."],
    ].map(([title, text], index) => <article key={title}><span className="number">0{index + 1}</span><div><h2>{title}</h2><p>{text}</p></div></article>)}</div><WeekExample /></section>
    <div className="bottom-note"><DifferenceDetails><div className="difference-content">{[
      ["Your church’s teaching.", "Build around your own passage, notes, and direction."], ["Human direction.", "The co-writer assists; your team edits, reviews, and approves."], ["Preparation to participation.", "Connect the team’s workspace to a focused member experience."], ["A rhythm beyond the feed.", "Return to a study calendar, Scripture, reflection, and practical responses."],
    ].map(([title, text]) => <p key={title}><strong>{title}</strong>{text}</p>)}</div></DifferenceDetails><Link className="text-link" href="/how-it-works">See the experience →</Link></div>
  </Page>;
}

export function HowItWorks() {
  return <Page><MarketingIntro eyebrow="FROM PREPARATION TO PARTICIPATION" title="One church. Two thoughtful experiences.">Bring sermon notes or an outline → shape a study with the co-writer → review and publish → read and reflect.</MarketingIntro><MarketingTour /><div className="bottom-note"><p><strong>Human review comes before publication.</strong><br />The church decides what is ready to share.</p><MarketingAction href="/ai-co-writer" secondary>Explore the AI co-writer</MarketingAction></div></Page>;
}

export function AICowriter() {
  return <Page><MarketingIntro eyebrow="HELPFUL AI. HUMAN DIRECTION." title={<>A little input.<br />A helpful head start.</>}>Start with a passage, sermon notes, or an upcoming outline. Shape a plan, then refine the study in your church’s voice.</MarketingIntro><a className="text-link page-shortcut" href="#example-co-writer">See the co-writer example ↓</a>
    <section className="ai-layout"><div className="ai-benefits"><article><h2>Less starting from scratch.</h2><p>Get help planning the week and drafting Scripture reflections, questions, and practical responses.</p></article><article><h2>More of your pastor’s message.</h2><p>Give the co-writer the teaching and context you want your church to explore.</p></article><div className="safeguard"><span aria-hidden="true">✓</span><div><strong>Your church stays in charge.</strong><p>Confirm each day before saving its editable draft. Review Scripture, teaching, and wording before publishing.</p></div></div><details className="context-details"><summary>How is our church’s context kept?<span aria-hidden="true">+</span></summary><p>Conversations stay scoped to your account and church. Your team agrees on the focus, notes, audience, and dates before creating studies.</p></details></div><CowriterExample /></section>
  </Page>;
}

export function PowerOfFour() {
  return <Page><MarketingIntro eyebrow="THE RHYTHM BEHIND ROOTED" title={<>Four days in the Word.<br /><em>Possibilities beyond Sunday.</em></>}>A steady invitation to return to Scripture: read, reflect, talk about it, and take one next step.</MarketingIntro>
    <section className="power-layout"><div className="four-days" aria-label="An illustrative four-day Scripture rhythm">{[["Return", "Meet the passage."], ["Explore", "Go a little deeper."], ["Reflect", "Bring it home."], ["Practice", "Live one next step."]].map(([title, text], index) => <article key={title}><span>0{index + 1}</span><h2>{title}</h2><p>{text}</p></article>)}</div><div className="research-panel" id="research-source" tabIndex={-1}><p className="eyebrow">BIBLE ENGAGEMENT RESEARCH</p><h2>Why encourage four days?</h2><p>The Center for Bible Engagement (CBE) reports that Scripture engagement four or more days a week is associated with higher odds of:</p><dl className="statistics">{[["Giving financially to a church", "+416%"], ["Sharing faith", "+228%"], ["Discipling others", "+231%"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="research-limit">Survey associations, not measured Rooted results or guaranteed outcomes. These describe reported odds, not percentage increases in giving amounts.</p><p className="research-limit engagement-note">Engagement includes considering and responding to Scripture. Four app visits alone do not measure it. CBE is cited as a research source, not a Rooted partner.</p><a className="text-link" href="https://www.odbm.org/en/center-for-bible-engagement/blog/bible-engagement-and-the-power-of-4-a-key-to-spiritual-growth" target="_blank" rel="noopener noreferrer">Read the CBE research <span className="sr-only">(opens in a new tab)</span>↗</a></div></section>
  </Page>;
}

function Question({ title, children }: { title: string; children: ReactNode }) { return <details><summary>{title}<span aria-hidden="true">+</span></summary><p>{children}</p></details>; }

export function Questions() {
  return <Page><MarketingIntro eyebrow="A FEW PRACTICAL ANSWERS" title="Made for your church’s real week.">Choose a question for more detail. The essentials stay in view.</MarketingIntro><section className="questions-layout"><div className="faqs">
    <Question title="Can we prepare before a sermon happens?">Yes. Start with an upcoming teaching outline or passage, then prepare studies that help your people anticipate the message.</Question>
    <Question title="How does AI help?">The co-writer helps plan and draft from your context. Confirm the plan and each day before saving editable drafts. Your team reviews Scripture, teaching, and wording before publication. Conversations stay scoped to your account and church. <Link href="/ai-co-writer">See an example →</Link></Question>
    <Question title="Do we need a study every day?">No. Choose a rhythm that fits your church. Four days is an invitation to regular Scripture engagement, not a requirement.</Question>
    <TrustQuestion />
    <Question title="What does Rooted cost?">We’re finalizing plan options. You’ll see clear pricing before choosing any paid plan.</Question>
    <Question title="What if I’m a member, not a church leader?">Use your church’s link or invitation to find its reading space. <Link href="/find-church">Find your church →</Link></Question>
    </div><aside className="question-card"><p className="eyebrow">SEE IT FOR YOURSELF</p><h2>A little time.<br />A place to begin.</h2><p>Explore a short sample study without an account.</p><MarketingAction href="/sample-study">Read a sample</MarketingAction><Link className="text-link" href="/get-started">Find your next step →</Link></aside></section></Page>;
}
