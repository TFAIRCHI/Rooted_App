"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const TabContext = createContext<{selected:number; setSelected:(value:number)=>void}>({selected:0,setSelected:()=>undefined});
export function PublicTabGroup({children}:{children:ReactNode}) { const [selected,setSelected]=useState(0); return <TabContext.Provider value={{selected,setSelected}}>{children}</TabContext.Provider>; }
export function PublicTabPanel({children,index,id,tab,className}:{children:ReactNode;index:number;id:string;tab:string;className?:string}) {const {selected}=useContext(TabContext);return <div id={id} className={className} role="tabpanel" aria-labelledby={tab} hidden={selected!==index}>{children}</div>;}
export function PublicTabs({ label, tabs, className }: { label: string; tabs: { label: string; id: string; panel: string }[]; className: string }) {
  const {selected, setSelected} = useContext(TabContext);
  return <div className={className} role="tablist" aria-label={label}>{tabs.map((tab, index) => <button key={tab.id} className="tab" role="tab" id={tab.id} aria-controls={tab.panel} aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} onClick={() => setSelected(index)} onKeyDown={event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    setSelected(next); document.getElementById(tabs[next].id)?.focus();
  }}>{tab.label}</button>)}</div>;
}

export function SampleReflection() {
  const [reflected, setReflected] = useState(false);
  return <><button type="button" aria-pressed={reflected} onClick={() => setReflected(!reflected)}>{reflected ? "Reflection marked ✓" : "Mark this moment of reflection ✓"}</button><span role="status">{reflected ? "A moment to carry into your day. This example is not saved." : "A small beginning is still a beginning."}</span></>;
}
