import Link from "next/link";
import { publishedResource, type Publication } from "../../../lib/member-server";
import { Notice } from "../../../components/ui";
import { StudyCompletionLabel } from "../../../components/member-study-reader";
import { memberDesignExamples } from "../../../lib/member-design-preview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rooted · Published studies", robots: { index: false, follow: false } };

function RootedMark() {
  return <svg aria-hidden="true" className="hero-mark" viewBox="0 0 100 100" fill="none"><path d="M50 5V95M5 50H95M18 18L82 82M82 18L18 82" /></svg>;
}
function Arrow() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M5 12H19M14 7L19 12L14 17" /></svg>;
}
function dateLabel(value: string, options: Intl.DateTimeFormatOptions) {
  return new Date(value).toLocaleDateString("en-US", { timeZone: "America/New_York", ...options });
}

export default async function MemberHome({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ all?: string; preview?: string }> }) {
  const { slug } = await params;
  const result = await publishedResource(slug);
  const studies = [...((result.data as { items: Publication[] } | null)?.items ?? [])].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const query = await searchParams;
  const preview = process.env.NODE_ENV === "development" && query.preview === "figma";
  const [featured, ...publishedPrevious] = studies;
  const previous = preview ? memberDesignExamples(result.churchId ?? featured?.churchId ?? "preview") : publishedPrevious;
  const showAll = query.all === "1";
  const churchName = result.theme?.churchName ?? result.session?.churches.find(church => church.slug === slug)?.name ?? "Your church";
  const studyHref = (study: Publication) => `/c/${encodeURIComponent(slug)}/studies/${encodeURIComponent(study.id)}${preview ? "?preview=figma" : ""}`;
  const readingMinutes = featured ? Math.max(1, Math.ceil(Object.values(featured.payload).filter(value => typeof value === "string").join(" ").split(/\s+/).length / 200)) : 0;
  return <div className="member-landing app-shell">
    <main id="main">
      <section className="library-hero">
        <div className="hero-orbit orbit-one" aria-hidden="true" /><div className="hero-orbit orbit-two" aria-hidden="true" />
        <div className="hero-inner"><div className="hero-copy"><p className="eyebrow mint">Your space for faith</p><h1>Make room for what matters.</h1><p>One study each week to help you slow down, listen closely, and carry truth into the days ahead.</p></div><div className="hero-mark-wrap"><RootedMark /><p>Growing deeper<strong>Together in faith</strong></p></div></div>
      </section>
      <div className="library-content">
        <section className="featured-section" aria-labelledby="featured-title">
          <div className="section-heading"><div><p className="eyebrow">{featured ? "The latest study" : "This week’s study"}</p><h2 id="featured-title">A word for the week ahead.</h2></div>{featured && <span className="fresh-label">Ready to read</span>}</div>
          {result.status === 503 ? <Notice error>The study service is unavailable. Please try again shortly.</Notice> : !result.data ? <section className="card"><h2>Studies are not available here yet.</h2><p>Ask your church for its public study link.</p></section> : featured ? <article className="featured-card">
            <div className="date-block" aria-label={dateLabel(featured.publishedAt, { dateStyle: "full" })}><span>{dateLabel(featured.publishedAt, { weekday: "short" })}</span><strong>{dateLabel(featured.publishedAt, { day: "numeric" })}</strong><small>{dateLabel(featured.publishedAt, { month: "short" })}</small></div>
            <div className="featured-main"><div className="study-meta">{featured.payload.references?.length ? <><span>{featured.payload.references.join(" · ")}</span><span className="meta-dot" /></> : null}<span>{readingMinutes} min read</span></div><h3>{featured.payload.title}</h3><p>{featured.payload.reflection || featured.payload.application}</p><Link className="primary-action" href={studyHref(featured)}><span>Begin this study</span><Arrow /></Link></div>
            <div className="featured-art" aria-hidden="true"><div className="art-sun"><span /><span /><span /><span /></div><blockquote>Make space for the words that remain.</blockquote></div>
          </article> : <section className="card"><h2>A new study is on its way.</h2><p>Published studies will appear here after church review. Drafts remain private.</p></section>}
        </section>
        <section className="rhythm-section" aria-labelledby="rhythm-title"><div className="rhythm-intro"><p className="eyebrow">A simple rhythm</p><h2 id="rhythm-title">Take the study at your own pace.</h2><p>There is no perfect way to begin. Find a quiet moment and let the questions stay with you.</p></div><ol className="rhythm-list">{[["Read", "Spend time with the passage and the week’s reflection."], ["Reflect", "Notice what draws your attention or challenges you."], ["Carry", "Take one thought or prayer with you into the week."]].map(([title, copy], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol></section>
        <section className="past-section" id="previous-studies" aria-labelledby="past-title"><div className="section-heading compact"><div><p className="eyebrow">The journey so far</p><h2 id="past-title">Previous studies</h2></div><Link className="text-action" href={`/c/${encodeURIComponent(slug)}?all=1${preview ? "&preview=figma" : ""}#previous-studies`}>View all studies <Arrow /></Link></div><div className="past-grid">{(showAll ? previous : previous.slice(0, 2)).map((study, index) => <Link className={`past-card ${index % 2 ? "clay" : "sage"}`} href={studyHref(study)} key={study.id}><span className="past-number" aria-hidden="true">{String(previous.length - index).padStart(2, "0")}</span><div><p>{dateLabel(study.publishedAt, { month: "long", day: "numeric", year: "numeric" })}{study.payload.references?.length ? ` · ${study.payload.references.join(" · ")}` : ""}</p><h3>{study.payload.title}</h3>{preview ? <span>Completed</span> : <StudyCompletionLabel churchId={result.churchId ?? study.churchId} studyId={study.id} />}</div></Link>)}{previous.length === 0 && <p className="past-empty">Your earlier studies will appear here once more studies are published.</p>}</div></section>

      </div>
    </main>
    <footer className="site-footer"><span className="wordmark">Rooted</span><p>Made for the people growing in faith together.</p><span>{churchName}</span></footer>
  </div>;
}
