"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";
import { marketingPages } from "../../lib/marketing";

export function MarketingHeader() {
  const pathname = usePathname();
  // Key the disclosure by path so Back/Forward and programmatic navigation also close it.
  return <HeaderNavigation key={pathname} pathname={pathname} />;
}

function HeaderNavigation({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const label = marketingPages.find(page => page.href === pathname)?.label ?? (pathname === "/get-started" ? "Get started" : pathname === "/sign-in" ? "Sign in" : pathname === "/sample-study" ? "Sample study" : "Explore");
  function close() { setOpen(false); }
  function escape(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && open) { event.preventDefault(); close(); toggle.current?.focus(); }
  }
  const current = (href: string) => pathname === href ? "page" as const : undefined;
  return <header className="site-header" onKeyDown={escape}>
    <div className="brand-row wrap">
      <Link className="brand" href="/" aria-label="Rooted home" onNavigate={close}><svg viewBox="0 0 32 36" aria-hidden="true"><path d="M16 34V17C4 17 2 7 2 7c12-2 14 10 14 10C16 5 25 1 30 2c0 12-14 15-14 15" fill="currentColor" /></svg>Rooted</Link>
      <span className="tagline">Rooted in Scripture. Growing together.</span>
      <div className="header-actions"><Link href="/sign-in" aria-current={current("/sign-in")}>Sign in</Link><Link className="button" href="/get-started" aria-current={current("/get-started")}>Get started <span aria-hidden="true">↗</span></Link></div>
      <button type="button" ref={toggle} className="menu-toggle" aria-label={`Menu: ${label === "Home" ? "Home" : label}`} aria-expanded={open} aria-controls="page-nav" onClick={() => setOpen(value => !value)}>{label === "Home" ? "Explore" : label}<span aria-hidden="true">☰</span></button>
    </div>
    <nav id="page-nav" className={`page-nav wrap${open ? " open" : ""}`} aria-label="Main navigation">
      {marketingPages.map(page => <Link key={page.href} href={page.href} aria-current={current(page.href)} onNavigate={close}>{page.label}</Link>)}
      <span className="nav-note">A little time. A shared direction.</span>
      <Link className="mobile-action" href="/sign-in" aria-current={current("/sign-in")} onNavigate={close}>Sign in</Link>
      <Link className="mobile-action" href="/get-started" aria-current={current("/get-started")} onNavigate={close}>Get started</Link>
    </nav>
    <noscript><style>{`@media(max-width:1100px){.marketing-site .menu-toggle{display:none}.marketing-site .page-nav{display:flex;flex-wrap:wrap;height:auto;padding-block:10px}.marketing-site .page-nav a{min-height:44px}.marketing-site .site-header{position:static}}`}</style></noscript>
  </header>;
}
