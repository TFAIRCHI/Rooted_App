// Adapted from the approved Public Website Research design. Native React markup; no prototype runtime.
import { SampleReflection } from './interactions';
export function SampleStudy() { return <div className="rooted-public"><svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{"position":"absolute","width":"0px","height":"0px","overflow":"hidden"}}>
<defs>
<symbol id="sprout" viewBox="0 0 40 40">
<path d="M20 34V17" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
</path>
<path d="M20 23C7 24 5 15 6 9c10-1 17 4 14 14ZM20 18C18 8 26 3 35 4c0 9-5 15-15 14Z" fill="currentColor">
</path>
</symbol>
<symbol id="book" viewBox="0 0 32 32">
<path d="M16 9C11 5 6 6 3 7v19c5-2 9-1 13 2 4-3 8-4 13-2V7c-3-1-8-2-13 2Zm0 0v19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
</path>
</symbol>
<symbol id="sun" viewBox="0 0 32 32">
<circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="1.7">
</circle>
<path d="M16 1v5m0 20v5M1 16h5m20 0h5M5 5l4 4m14 14 4 4M27 5l-4 4M9 23l-4 4" stroke="currentColor" strokeWidth="1.7">
</path>
</symbol>
<symbol id="home" viewBox="0 0 32 32">
<path d="m3 15 13-11 13 11M7 12v16h18V12M13 28V18h6v10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
</path>
</symbol>
<symbol id="chat" viewBox="0 0 32 32">
<path d="M5 5h22v17H14l-8 6v-6H5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
</path>
<path d="M10 11h12m-12 5h8" stroke="currentColor" strokeWidth="1.8">
</path>
</symbol>
<symbol id="path" viewBox="0 0 32 32">
<path d="M5 27V10a5 5 0 0 1 10 0v12a5 5 0 0 0 10 0V5m-5 5 5-5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
</path>
</symbol>
<symbol id="people" viewBox="0 0 32 32">
<circle cx="12" cy="10" r="5" fill="none" stroke="currentColor" strokeWidth="1.7">
</circle>
<path d="M3 28v-5a9 9 0 0 1 18 0v5M23 5a5 5 0 0 1 0 10m1 4a8 8 0 0 1 5 8" fill="none" stroke="currentColor" strokeWidth="1.7">
</path>
</symbol>
<symbol id="check" viewBox="0 0 32 32">
<path d="m7 17 6 6L26 9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
</path>
</symbol>
<symbol id="church" viewBox="0 0 32 32">
<path d="M6 29V14l10-8 10 8v15ZM12 29V19h8v10M16 6V1m-4 3h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
</path>
</symbol>
<symbol id="family-table" viewBox="0 0 580 400">
<rect width="580" height="400" rx="26" fill="#dfe9df">
</rect>
<path d="M0 310C129 260 369 260 580 317v83H0" fill="#cadbc9">
</path>
<rect x="36" y="37" width="122" height="147" rx="60" fill="#f9f4df">
</rect>
<path d="M97 38v147M36 110h123" stroke="#c8d5c3" strokeWidth="5">
</path>
<path d="M473 284c0-65 6-109 12-161" stroke="#527967" strokeWidth="5">
</path>
<path d="M484 185c-54-2-57-43-51-63 40 5 62 26 51 63M483 164c-3-43 30-63 54-58 5 29-13 57-54 58M479 234c-52-2-64-35-53-57 43 7 61 22 53 57" fill="#638d74">
</path>
<path d="M449 280h63l-10 54h-44Z" fill="#cc795b">
</path>
<path d="M177 349v45m233-45v45" stroke="#9c644b" strokeWidth="12">
</path>
<path d="M107 299c0-66 10-118 59-118s58 61 58 118" fill="#f3b66e">
</path>
<ellipse cx="166" cy="137" rx="34" ry="41" fill="#9a6146">
</ellipse>
<path d="M131 137c-10-63 75-66 70-4-15-23-47-9-70 4" fill="#334c46">
</path>
<path d="M231 313c0-72 10-101 46-101s53 39 53 101" fill="#dc886d">
</path>
<ellipse cx="280" cy="181" rx="26" ry="31" fill="#d49b75">
</ellipse>
<path d="M251 177c-12-43 59-46 59 1-11-16-35-17-59-1" fill="#5a3b31">
</path>
<path d="M342 300c-5-73 16-122 60-122s57 59 57 122" fill="#376d62">
</path>
<ellipse cx="401" cy="130" rx="33" ry="41" fill="#dfa27c">
</ellipse>
<path d="M366 130c-14-70 77-66 72 13-6 12-15 14-20 13l2-39c-24 9-34 3-54 13" fill="#5c4036">
</path>
<path d="m191 248 48 40 47-3m87-43-44 44-35 1" fill="none" stroke="#9a6146" strokeWidth="16" strokeLinecap="round">
</path>
<path d="m373 247-37 41-30 0" stroke="#dfa27c" strokeWidth="16" fill="none" strokeLinecap="round">
</path>
<ellipse cx="291" cy="316" rx="204" ry="35" fill="#b67a57">
</ellipse>
<path d="M87 315v19c72 50 334 49 408 0v-19" fill="#a86b4c">
</path>
<path d="m235 303 53-16 65 14-55 24Z" fill="#fffcf1">
</path>
<path d="m288 287 10 38m-48-19 24-7m36 1 26 5" stroke="#c6c4a5" strokeWidth="2">
</path>
<ellipse cx="180" cy="309" rx="19" ry="6" fill="#f2ead1">
</ellipse>
<path d="M164 293h28v16c-5 8-22 8-28 0Z" fill="#fff9e9">
</path>
<path d="M192 296c16-5 16 14 0 10" stroke="#fff9e9" strokeWidth="4" fill="none">
</path>
<path d="m292 67 8 14 15 3-11 11 1 15-13-7-14 7 2-16-11-10 16-3Z" fill="#d7b65b">
</path>
</symbol>
</defs>
</svg>

<div className="study-page">
<header className="study-nav">
<a className="brand" href="/" aria-label="Rooted home">
<svg className="icon " aria-hidden="true">
<use href="#sprout">
</use>
</svg>{"Rooted"}</a>
<span>{"HARBOR CHURCH · SAMPLE STUDY"}</span>
</header>
<main className="study-content" id="main">
<a className="back-link" href="/#your-week">{"← Back to exploring Rooted"}</a>
<span className="eyebrow">{"A LITTLE TIME IN THE WORD · MONDAY"}</span>
<h1>{"Make room"}<br />{"to remain."}</h1>
<p className="meta">{"This week: A life that grows · A sample member devotional"}</p>
<div className="passage">
<small>{"BEGIN WITH THE BIBLE"}</small>
<b>{"Read John 15:1–8"}</b>
</div>
<p>{"In a busy week, it is easy to measure growth by what we get done. Jesus gives us a different starting point: remaining close to Him."}</p>
<p>{"Think back to the message your church explored on Sunday. The invitation was not to make your life look more impressive. It was to stay connected to the One who gives it life."}</p>
<p>{"Today, make a little space to read the passage slowly. Notice what Jesus says about connection, dependence, and fruit. What might change if you began this week by making room to remain?"}</p>
<section className="reflection">
<small>{"TAKE IT INTO YOUR DAY"}</small>
<h2>{"Where could you make room"}<br />{"for God this week?"}</h2>
</section>
<p>{"At home, ask someone: “What is one thing that helps you stay close to God when life gets busy?” Listen before offering an answer of your own."}</p>
<div className="study-action">
<SampleReflection />
</div>
<p className="fine-note" style={{"fontStyle":"normal","fontVariant":"normal","fontWeight":"normal","fontSize":"11px","lineHeight":"1.8","fontFamily":"Arial, sans-serif","font":"11px / 1.8 Arial, sans-serif","color":"var(--muted)"}}>{"Illustrative devotional written for this design exploration. The completed product uses your church’s reviewed and published content."}</p>
</main>
<footer className="site-footer">
<div className="wrap">
<div className="footer-top">
<a className="brand" href="/" aria-label="Rooted home">
<svg className="icon " aria-hidden="true">
<use href="#sprout">
</use>
</svg>{"Rooted"}</a>
<p>{"Rooted in Scripture. Growing together."}</p>
<a className="text-link" href="/get-started">{"Find your next step "}<span>{"↗"}</span>
</a>
</div>
<div className="footer-bottom">
<span>{"© 2026 Rooted"}</span>
<div className="footer-links">
<a href="/#how-it-works">{"How it works"}</a>
<a href="/#power-of-four">{"The Power of 4"}</a>
<a href="/#ai-co-writer">{"AI & human review"}</a>
<a href="/sign-in">{"Sign in"}</a>
</div>
</div>
</div>
</footer>
</div></div>; }
