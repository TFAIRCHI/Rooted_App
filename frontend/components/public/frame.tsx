import Link from "next/link";
import type { ReactNode } from "react";
import { MarketingFrame, MarketingFooter } from "./marketing-frame";

export function PublicBrand() { return <Link className="brand" href="/" aria-label="Rooted home"><svg viewBox="0 0 32 36" aria-hidden="true"><path d="M16 34V17C4 17 2 7 2 7c12-2 14 10 14 10C16 5 25 1 30 2c0 12-14 15-14 15" fill="currentColor" /></svg>Rooted</Link>; }
export function PublicFooter() { return <MarketingFooter />; }
export function PublicFrame({ children }: { children: ReactNode }) { return <MarketingFrame legacy>{children}</MarketingFrame>; }
export function FlowStory({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children: ReactNode }) { return <section className="flow-story"><Link className="back-link" href="/get-started">← Back to getting started</Link><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{children}<div className="mini-trail"><span>1</span> Account <i /><span>2</span> Your church <i /><span>3</span> Begin</div></section>; }
