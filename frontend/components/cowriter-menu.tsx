"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";

export function CowriterMenu({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }) {
  const id = useId(), container = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) { if (!container.current?.contains(event.target as Node)) onOpenChange(false); }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, onOpenChange]);
  return <div ref={container} className="cowriter-menu" onKeyDown={event => { if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); onOpenChange(false); trigger.current?.focus(); } }}>
    <button ref={trigger} type="button" className="cowriter-icon-button" aria-label="Co-writer menu" aria-expanded={open} aria-controls={id} onClick={() => onOpenChange(!open)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
    <nav id={id} className="cowriter-menu-panel" aria-label="Co-writer tools and conversations" hidden={!open}>{children}</nav>
  </div>;
}
