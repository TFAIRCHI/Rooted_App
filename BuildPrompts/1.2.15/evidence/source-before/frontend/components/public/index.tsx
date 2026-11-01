// Adapted from the approved Public Website Research design. Native React markup; no prototype runtime.
import { PublicTabs, PublicTabGroup, PublicTabPanel } from './interactions';
import { ProductShowcase, ResearchHighlights, RootedDifference } from './product-showcase';
export function PublicHome() { return <div className="rooted-public">
<header className="site-header wrap">
<a className="brand" href="/" aria-label="Rooted home">
<svg className="icon " aria-hidden="true">
<use href="#sprout">
</use>
</svg>{"Rooted"}</a>
<nav className="nav-links" aria-label="Main">
<a href="#why-rooted">{"Why Rooted"}</a>
<a href="#how-it-works">{"How it works"}</a>
<a href="#ai-co-writer">{"AI Co-writer"}</a>
<a href="#power-of-four">{"The Power of 4"}</a>
</nav>
<div className="nav-actions">
<a href="/sign-in">{"Sign in"}</a>
<a className="button small" href="/get-started">{"Get started "}<span aria-hidden="true">{"↗"}</span>
</a>
</div>
</header>
<main id="main">
<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{"position":"absolute","width":"0px","height":"0px","overflow":"hidden"}}>
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
<div className="wrap">
</div>
<div className="wrap">
<section className="hero">
<div>
<span className="eyebrow dot">{"YOUR SERMON. THEIR EVERYDAY."}</span>
<h1>{"Let Sunday"}<br />{"take root."}<br />
<em>{"All week long."}</em>
</h1>
<p className="lede">{"Create Bible studies from your church’s teaching with an AI co-writer that helps your team plan and draft. Keep people connected, growing in Scripture, and bringing faith into everyday life."}</p>
<div className="hero-actions">
<a className="button" href="/get-started">{"Get started with your church "}<span aria-hidden="true">{"↗"}</span>
</a>
<a className="text-link" href="#how-it-works">{"See how it works "}<span>{"↓"}</span>
</a>
</div>
<p className="hero-note">{"Led by your church. Made for real life."}</p>
</div>
<div className="hero-art" role="img" aria-label="One Sunday sermon becoming four Scripture moments during the week, shown on a member's phone">
<div className="art-backdrop">
</div>
<svg className="art-sun" viewBox="0 0 32 32">
<use href="#sun">
</use>
</svg>
<svg className="orbit-arrow" viewBox="0 0 160 80" fill="none" aria-hidden="true">
<path d="M6 64C55-12 107 0 142 29m-24-5 26 8-1-27" stroke="#2c705c" strokeWidth="2" strokeLinecap="round">
</path>
</svg>
<div className="sermon-card">
<svg className="icon " aria-hidden="true">
<use href="#church">
</use>
</svg>
<small>{"IT STARTS ON SUNDAY"}</small>
<strong>{"A message worth"}<br />{"living all week."}</strong>
<p>{"Your pastor. Your church."}<br />{"A shared direction."}</p>
</div>
<div className="week-phone">
<div className="phone-notch">
</div>
<div className="phone-church">{"HARBOR CHURCH · ROOTED"}</div>
<div className="phone-title">{"A little time."}<br />{"Deeper roots."}</div>
<div className="phone-day">
<span className="date">{"MON"}</span>
<div>
<b>{"Remain in Him"}</b>
<small>{"John 15:1–8"}</small>
</div>
</div>
<div className="phone-day">
<span className="date">{"WED"}</span>
<div>
<b>{"Room to grow"}</b>
<small>{"Explore the passage"}</small>
</div>
</div>
<div className="phone-day">
<span className="date">{"FRI"}</span>
<div>
<b>{"At your table"}</b>
<small>{"Reflect together"}</small>
</div>
</div>
<div className="phone-day">
<span className="date">{"SAT"}</span>
<div>
<b>{"One next step"}</b>
<small>{"Put it into practice"}</small>
</div>
</div>
<div className="phone-read">
<span>{"YOUR WEEK IN THE WORD"}</span>
<span>{"↗"}</span>
</div>
</div>
<div className="art-note">
<b>{"From the pew"}<br />{"to the everyday."}</b>
<p>{"Small moments. Shared growth."}</p>
</div>
<span className="tiny-star" aria-hidden="true">{"✳"}</span>
</div>
</section>
<ResearchHighlights />
<div className="intro-strip">
<div>
<svg className="icon " aria-hidden="true">
<use href="#church">
</use>
</svg>
<span>{"Your church’s voice"}</span>
</div>
<div>
<svg className="icon " aria-hidden="true">
<use href="#path">
</use>
</svg>
<span>{"A rhythm you can sustain"}</span>
</div>
<div>
<svg className="icon " aria-hidden="true">
<use href="#home">
</use>
</svg>
<span>{"Faith that comes home"}</span>
</div>
</div>
</div>
<section id="why-rooted" className="section benefits">
<div className="wrap">
<div className="section-title">
<div>
<span className="eyebrow">{"MORE THAN A SUNDAY MOMENT"}</span>
<h2>{"There’s more room"}<br />{"for the message to grow."}</h2>
</div>
<p>{"Sunday plants a seed. Rooted helps your church make space for what happens next."}</p>
</div>
<div className="benefit-grid">
<article className="benefit">
<svg className="icon " aria-hidden="true">
<use href="#chat">
</use>
</svg>
<h3>{"Stay connected beyond Sunday"}</h3>
<p>{"Keep your church growing around the same passage, questions, and practical next steps throughout the week."}</p>
</article>
<article className="benefit">
<svg className="icon " aria-hidden="true">
<use href="#sun">
</use>
</svg>
<h3>{"Prepare hearts for what’s next"}</h3>
<p>{"Introduce an upcoming sermon’s passage and big questions, so Sunday begins with shared understanding."}</p>
</article>
<article className="benefit">
<svg className="icon " aria-hidden="true">
<use href="#book">
</use>
</svg>
<h3>{"Go further in what you heard"}</h3>
<p>{"Return to Sunday’s message with context, supporting passages, and time to explore what a sermon can only begin."}</p>
</article>
</div>
</div>
</section>
<RootedDifference />
<ProductShowcase />
<section className="section ai-section" id="ai-co-writer">
<div className="wrap">
<div className="ai-layout">
<div className="ai-intro">
<span className="eyebrow">{"YOUR AI STUDY CO-WRITER"}</span>
<h2>{"A little input."}<br />{"A helpful head start."}</h2>
<p>{"Start with an idea, a Scripture passage, or detailed sermon notes. Rooted’s AI co-writer asks questions, shapes a plan with you, and helps create complete daily devotionals for your team to review."}</p>
<div className="ai-benefit">
<h3>{"Less starting from scratch."}</h3>
<p>{"Get help with outlines, explanations, reflection questions, and practical next steps."}</p>
</div>
<div className="ai-benefit">
<h3>{"More of your pastor’s message."}</h3>
<p>{"Carry the central teaching through the week, with the audience and depth your church has in mind."}</p>
</div>
<div className="ai-benefit">
<h3>{"Complete studies, ready to refine."}</h3>
<p>{"Confirmed days become saved drafts in your workspace. Keep refining together before sharing."}</p>
</div>
<a className="text-link" href="#how-it-works">{"See the co-writer’s place in the process "}<span aria-hidden="true">{"↗"}</span>
</a>
</div>
<PublicTabGroup>
<div className="ai-examples">
<PublicTabs className="tabs ai-tabs" label="AI co-writer starting points" tabs={[{"label":"Simple request","id":"ai-simple-tab","panel":"ai-simple-panel"},{"label":"Detailed notes","id":"ai-detailed-tab","panel":"ai-detailed-panel"}]} />
<PublicTabPanel index={0} id="ai-simple-panel" tab="ai-simple-tab" className="ai-example">
<div className="ai-chat-header">
<span aria-hidden="true">{"✦"}</span>
<div>
<strong>{"Study Co-writer"}</strong>
<small>{"Your message. A week with purpose."}</small>
</div>
</div>
<div className="ai-chat-body">
<p className="ai-message user">{"Help me plan three adult devotionals for next week about trusting God."}</p>
<p className="ai-message agent">{"Let’s shape the direction together. Which passage should anchor the studies, and what would you like people to carry into their week?"}</p>
<div className="ai-mini-plan">
<small>{"EXAMPLE PLAN · AFTER AGREEING ON THE DIRECTION"}</small>
<div>
<span>{"01"}</span>
<strong>{"Understand the passage"}</strong>
</div>
<div>
<span>{"02"}</span>
<strong>{"Reflect on the message"}</strong>
</div>
<div>
<span>{"03"}</span>
<strong>{"Live one next step"}</strong>
</div>
</div>
<div className="ai-confirm-note">
<svg className="icon " aria-hidden="true">
<use href="#check">
</use>
</svg>
<span>{"Review the plan. Confirm each day. Then shape the saved drafts."}</span>
</div>
</div>
<div className="ai-example-foot">{"Illustrative conversation · your church reviews before publishing"}</div>
</PublicTabPanel>
<PublicTabPanel index={1} id="ai-detailed-panel" tab="ai-detailed-tab" className="ai-example">
<div className="ai-chat-header">
<span aria-hidden="true">{"✦"}</span>
<div>
<strong>{"Study Co-writer"}</strong>
<small>{"Your message. A week with purpose."}</small>
</div>
</div>
<div className="ai-chat-body">
<p className="ai-message user">{"John 15:1–8. Our message is about remaining close to Jesus. Use these sermon notes to plan three adult devotionals, with reflection, practical application, and prayer."}</p>
<p className="ai-message agent">{"Let’s keep that message running through the week. We can move from understanding the passage to everyday application. What should readers take away?"}</p>
<div className="ai-mini-plan">
<small>{"EXAMPLE PLAN · AFTER AGREEING ON THE DIRECTION"}</small>
<div>
<span>{"01"}</span>
<strong>{"Understand the passage"}</strong>
</div>
<div>
<span>{"02"}</span>
<strong>{"Reflect on the message"}</strong>
</div>
<div>
<span>{"03"}</span>
<strong>{"Live one next step"}</strong>
</div>
</div>
<div className="ai-confirm-note">
<svg className="icon " aria-hidden="true">
<use href="#check">
</use>
</svg>
<span>{"Review the plan. Confirm each day. Then shape the saved drafts."}</span>
</div>
</div>
<div className="ai-example-foot">{"Illustrative conversation · your church reviews before publishing"}</div>
</PublicTabPanel>
</div>
</PublicTabGroup>
</div>
<aside className="ai-safeguards" aria-label="AI safeguards">
<div className="ai-safeguards-heading">
<svg className="icon " aria-hidden="true">
<use href="#check">
</use>
</svg>
<h3>{"Helpful AI. Your church stays in charge."}</h3>
</div>
<div className="ai-safeguard-grid">
<div>
<strong>{"Agree before creating."}</strong>
<p>{"Review the focus, notes, audience, and dates."}</p>
</div>
<div>
<strong>{"Confirm each day."}</strong>
<p>{"Each day waits for your confirmation before it becomes a saved draft."}</p>
</div>
<div>
<strong>{"Review before publishing."}</strong>
<p>{"Your team checks Scripture, teaching, and wording before members see it."}</p>
</div>
<div>
<strong>{"Keep your church’s context."}</strong>
<p>{"Conversations stay scoped to your account and church."}</p>
</div>
</div>
</aside>
</div>
</section>
<section className="section week-section" id="your-week">
<PublicTabGroup>
<div className="wrap">
<div className="rhythm-head">
<div>
<span className="eyebrow">{"ONE MESSAGE. MANY MOMENTS."}</span>
<h2>{"Sunday is a beginning."}<br />{"Build a rhythm around it."}</h2>
<p>{"Go deeper after the sermon, or prepare the way for the next one. Your church chooses the days and the direction."}</p>
<PublicTabs className="tabs" label="Weekly study approach" tabs={[{"label":"After Sunday","id":"after-tab","panel":"after-panel"},{"label":"Before Sunday","id":"before-tab","panel":"before-panel"}]} />
</div>
<div className="rhythm-quote">
<p>{"Not another thing to keep up with."}<br />{"A way to keep coming back."}</p>
<small>{"TO SCRIPTURE. TO ONE ANOTHER. TO WHAT MATTERS."}</small>
</div>
</div>
<PublicTabPanel index={0} id="after-panel" tab="after-tab" className="">
<div className="week-track">
<article className="week-moment">
<div className="week-pin dark">{"SUN"}</div>
<div className="moment-card">
<span>{"Gather"}</span>
<h3>{"Hear the message"}</h3>
<p>{"Begin with the Scripture your pastor is teaching."}</p>
</div>
</article>
<article className="week-moment">
<div className="week-pin ">{"MON"}</div>
<div className="moment-card">
<span>{"Receive"}</span>
<h3>{"Return to the Word"}</h3>
<p>{"Revisit the passage and the heart of the message."}</p>
</div>
</article>
<article className="week-moment">
<div className="week-pin ">{"WED"}</div>
<div className="moment-card">
<span>{"Reflect"}</span>
<h3>{"Go a little deeper"}</h3>
<p>{"Explore the context and ask an honest question."}</p>
</div>
</article>
<article className="week-moment">
<div className="week-pin ">{"FRI"}</div>
<div className="moment-card">
<span>{"Respond"}</span>
<h3>{"Bring it home"}</h3>
<p>{"Read the passage together and talk it through at home."}</p>
</div>
</article>
<article className="week-moment">
<div className="week-pin ">{"SAT"}</div>
<div className="moment-card">
<span>{"Practice"}</span>
<h3>{"Live one next step"}</h3>
<p>{"Return to Scripture and put one truth into practice."}</p>
</div>
</article>
</div>
</PublicTabPanel>
<PublicTabPanel index={1} id="before-panel" tab="before-tab" className="">
<div className="week-track">
<article className="week-moment">
<div className="week-pin ">{"MON"}</div>
<div className="moment-card">
<span>{"Look ahead"}</span>
<h3>{"Meet the passage"}</h3>
<p>{"Read the upcoming sermon passage and notice one question."}</p>
</div>
</article>
<article className="week-moment">
<div className="week-pin ">{"WED"}</div>
<div className="moment-card">
<span>{"Understand"}</span>
<h3>{"Find the context"}</h3>
<p>{"Explore the people, setting, and main idea."}</p>
</div>
</article>
<article className="week-moment">
<div className="week-pin ">{"FRI"}</div>
<div className="moment-card">
<span>{"Connect"}</span>
<h3>{"Make it personal"}</h3>
<p>{"Think about what this passage asks of your everyday life."}</p>
</div>
</article>
<article className="week-moment">
<div className="week-pin ">{"SAT"}</div>
<div className="moment-card">
<span>{"Prepare"}</span>
<h3>{"Pray & anticipate"}</h3>
<p>{"Bring a question and an open heart to Sunday."}</p>
</div>
</article>
<article className="week-moment">
<div className="week-pin dark">{"SUN"}</div>
<div className="moment-card">
<span>{"Gather"}</span>
<h3>{"Hear it together"}</h3>
<p>{"Come ready to listen, learn, and respond as a church."}</p>
</div>
</article>
</div>
</PublicTabPanel>
<p className="example-note">{"An example rhythm, not a required schedule. The four weekday moments invite personal Scripture engagement alongside Sunday’s gathering."}</p>
</div>
</PublicTabGroup>
</section>
<section className="section family">
<div className="wrap family-layout">
<svg className="family-art" role="img" aria-label="An original illustration of a family gathered around an open Bible at home" viewBox="0 0 580 400">
<use href="#family-table">
</use>
</svg>
<div>
<span className="eyebrow">{"FROM THE CHURCH TO THE KITCHEN TABLE"}</span>
<h2>{"Bring the message"}<br />{"home with you."}</h2>
<p>{"Give parents, couples, and households a starting point for meaningful conversations—rooted in what their own pastor is teaching."}</p>
<p>{"A passage to read. A question to ask. A truth to practice. Space for the questions that don’t fit into a Sunday morning."}</p>
<a className="text-link" href="/sample-study">{"Explore a sample devotional "}<span aria-hidden="true">{"↗"}</span>
</a>
<div className="family-tip">
<span>{"A QUESTION FOR YOUR TABLE"}</span>
<p>{"“What could this look like"}<br />{"in our family this week?”"}</p>
</div>
</div>
</div>
</section>
<section className="section" id="how-it-works">
<div className="wrap">
<div className="section-title">
<div>
<span className="eyebrow">{"A SIMPLE PROCESS. A SHARED PURPOSE."}</span>
<h2>{"From sermon to study."}<br />{"From study to everyday life."}</h2>
</div>
<p>{"Rooted gives your team a clear path from the message you’re teaching to the people you’re caring for."}</p>
</div>
<div className="process-grid">
<article className="process-item">
<span className="number">{"01"}</span>
<h3>{"Bring your message"}</h3>
<p>{"Start with your pastor’s sermon notes, summary, or an upcoming teaching outline."}</p>
</article>
<article className="process-item">
<span className="number">{"02"}</span>
<h3>{"Shape your week"}</h3>
<p>{"Choose study days. Draft with the AI co-writer, ask questions, and refine the direction together."}</p>
</article>
<article className="process-item">
<span className="number">{"03"}</span>
<h3>{"Review, then share"}</h3>
<p>{"Your church reviews the words and publishes the studies it’s ready to share."}</p>
</article>
<article className="process-item">
<span className="number">{"04"}</span>
<h3>{"Grow through the week"}</h3>
<p>{"Members read, reflect, ask questions, and bring the conversation into their homes."}</p>
</article>
</div>
<div className="approval-note">
<svg className="icon " aria-hidden="true">
<use href="#check">
</use>
</svg>
<span>
<strong>{"Helpful assistance. Your church’s direction."}</strong>{" The co-writer helps prepare drafts. People review and decide what gets shared."}</span>
</div>
</div>
</section>
<section className="section power" id="power-of-four">
<div className="wrap">
<div className="power-layout">
<div>
<span className="eyebrow">{"THE POWER OF 4 · CENTER FOR BIBLE ENGAGEMENT"}</span>
<h2>{"Four days."}<br />{"A deeper rhythm."}</h2>
<p>{"CBE’s research links engaging with Scripture on four or more days a week with stronger measures of spiritual growth."}</p>
<p>{"Rooted helps your church make room for that rhythm: coming back to the Bible, reflecting on its meaning, and putting it into practice."}</p>
<a className="text-link" href="https://www.odbm.org/en/center-for-bible-engagement/blog/bible-engagement-and-the-power-of-4-a-key-to-spiritual-growth" target="_blank" rel="noopener">{"Explore the CBE research "}<span aria-hidden="true">{"↗"}</span>
</a>
</div>
<div className="four-visual" role="img" aria-label="Four illustrative Scripture engagement days: Monday, Wednesday, Friday and Saturday">
<div className="four-day">
<b>{"01"}</b>
<span>{"Monday · Read the passage"}</span>
</div>
<div className="four-day">
<b>{"02"}</b>
<span>{"Wednesday · Reflect"}</span>
</div>
<div className="four-day">
<b>{"03"}</b>
<span>{"Friday · Discuss at home"}</span>
</div>
<div className="four-day">
<b>{"04"}</b>
<span>{"Saturday · Respond"}</span>
</div>
</div>
</div>
<div className="research-note">{"* Source: Center for Bible Engagement, Bible Engagement and The Power of 4 research synthesis. The findings describe associations in survey data, not guaranteed outcomes from using Rooted. Four days means engagement with Scripture—not four app opens. Rooted is not affiliated with or endorsed by CBE."}</div>
</div>
</section>
<section className="section" id="questions">
<div className="wrap faq-layout">
<div>
<span className="eyebrow">{"A FEW THINGS YOU MIGHT BE WONDERING"}</span>
<h2>{"Made for your"}<br />{"church’s real week."}</h2>
<p>{"You bring the teaching and the people. Rooted helps you connect the two."}</p>
</div>
<div className="faqs">
<details open>
<summary>{"Can we prepare for a sermon that hasn’t happened yet?"}</summary>
<p>{"Yes. Start with the passage and teaching outline your pastor wants to introduce. Choose study dates leading up to Sunday, then review the content before sharing it."}</p>
</details>
<details>
<summary>{"How does AI help us create studies?"}</summary>
<p>{"Begin with a simple request or bring detailed sermon notes. The AI co-writer helps clarify your goals, organize a multi-day plan, and prepare complete editable drafts. Your team confirms the direction and each day, checks the teaching and Scripture, and decides when to publish."}</p>
<a className="text-link" href="#ai-co-writer">{"Explore the Study Co-writer →"}</a>
</details>
<details>
<summary>{"Do we have to create a study every day?"}</summary>
<p>{"No. Choose a rhythm your team and congregation can sustain. You can encourage Scripture engagement throughout the week without making every day a new production."}</p>
</details>
<details id="trust">
<summary>{"Who decides what our members see?"}</summary>
<p>{"Your church does. Drafting, review, and publication are separate steps. Your church’s workspace and member experience remain distinct from other churches."}</p>
</details>
<details>
<summary>{"What does Rooted cost?"}</summary>
<p>{"We’re finalizing plan options. You’ll see clear pricing before choosing any paid plan."}</p>
</details>
<details>
<summary>{"What if I’m a member, not a church leader?"}</summary>
<p>{"Use the church link or invitation your church shares with you. You can join your church’s experience without setting up a new church workspace."}</p>
<a className="text-link" href="/find-church">{"Join your church "}<span aria-hidden="true">{"↗"}</span>
</a>
</details>
</div>
</div>
</section>
<div className="wrap">
<section className="final-cta">
<div>
<span className="eyebrow">{"LET’S GROW SOMETHING TOGETHER"}</span>
<h2>{"A message on Sunday."}<br />{"A shared direction all week."}</h2>
<p>{"Make room for Scripture in the everyday life of your church."}</p>
</div>
<a className="button" href="/get-started">{"Get started with Rooted "}<span aria-hidden="true">{"↗"}</span>
</a>
</section>
</div>
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
</footer></div>; }
