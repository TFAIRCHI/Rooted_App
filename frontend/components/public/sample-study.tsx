import { PublicFrame } from './frame';
import { SampleReflection } from './interactions';

export function SampleStudy() { return <PublicFrame><main className="study-content" id="main">
<a className="back-link" href="/why-rooted#example-week">{"← Back to exploring Rooted"}</a>
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
<p className="fine-note" style={{"fontStyle":"normal","fontVariant":"normal","fontWeight":"normal","fontSize":"11px","lineHeight":"1.8","fontFamily":"Arial, sans-serif","font":"11px / 1.8 Arial, sans-serif","color":"var(--muted)"}}>{"Illustrative devotional. Your church’s own studies use its reviewed and published content."}</p>
</main></PublicFrame>; }
