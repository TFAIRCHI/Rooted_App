import Link from "next/link";
import type { ReactNode } from "react";
import { MarketingHeader } from "./marketing-header";

export function MarketingFooter() {
  return <footer className="wrap"><p>Rooted in Scripture. Growing together.</p><div><Link href="/questions">Questions</Link><Link href="/sms">Study texts</Link><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms &amp; Conditions</Link><Link href="/get-started">Find your next step ↗</Link></div></footer>;
}

export function MarketingFrame({ children, legacy = false }: { children: ReactNode; legacy?: boolean }) {
  return <div className="marketing-site"><MarketingHeader />{legacy ? <div className="rooted-public marketing-flow"><div className="flow-page">{children}</div></div> : children}<MarketingFooter /></div>;
}

export function MarketingAction({ children, href, secondary = false }: { children: ReactNode; href: string; secondary?: boolean }) {
  return <Link className={`button${secondary ? " secondary" : ""}`} href={href}>{children}<span aria-hidden="true">↗</span></Link>;
}

export function MarketingIntro({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children: ReactNode }) {
  return <div className="page-intro"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="lede">{children}</p></div>;
}
