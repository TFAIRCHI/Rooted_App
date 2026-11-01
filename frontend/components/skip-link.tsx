"use client";

import type { MouseEvent } from "react";

export function SkipLink() {
  function skip(event: MouseEvent<HTMLAnchorElement>) {
    const main = document.getElementById("main");
    if (!main || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    // Focus the target without adding a fragment-only entry to App Router history.
    // The href remains a native fallback before hydration or with JavaScript off.
    event.preventDefault();
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    main.focus({ preventScroll: true });
    main.scrollIntoView({ block: "start", behavior: "instant" });
  }
  return <a className="skip-link" href="#main" onClick={skip}>Skip to content</a>;
}
