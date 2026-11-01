"use client";

import { useEffect, useRef, useState } from "react";
import { api, type Session } from "../lib/api";
import { type WorkspaceData, type Slot, longDate, shortDate, timeLabel, statusLabel } from "../lib/types";
import { churchToday, dateAtNoon, hasPublication, isInactive, monthWeeks, shiftMonth, studyTitle, validMonth } from "../lib/study-dates";
import { Empty, Heading, Notice } from "./ui";
import { UnifiedPlanEditor } from "./unified-plan-editor";
import { SlotSettings } from "./slot-settings";
import { StudyLifecycleActions } from "./study-lifecycle-actions";

export function studyState(data: WorkspaceData, slot: Slot) {
  const content = data.content.find(item => item.slotId === slot.id);
  return content?.status ?? "not started";
}

export function CalendarBoard({ data, slots, month, selected, selectSlot, canMove, requestMove }: { data: WorkspaceData; slots: Slot[]; month: string; selected?: Slot; selectSlot: (slot: Slot) => void; canMove: boolean; requestMove: (slot: Slot, date: string) => void }) {
  const first = dateAtNoon(`${month}-01`);
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((first.getUTCDay() + count) / 7) * 7 }, (_, index) => {
    const day = index - first.getUTCDay() + 1;
    return day < 1 || day > count ? null : `${month}-${String(day).padStart(2, "0")}`;
  });
  return <section className="calendar-board" aria-label="Study calendar"><div className="calendar-legend"><span className="calendar-legend-approved">Approved / published</span><span className="calendar-legend-pending">Draft / awaiting approval</span><span className="calendar-legend-not-started">Not started</span></div><div className="calendar-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{cells.map((date, index) => <div key={date ?? `blank-${index}`} data-date={date ?? undefined} className={`calendar-cell ${date ? "" : "calendar-blank"}`} onDragOver={event => { if (canMove && date) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } }} onDrop={event => { event.preventDefault(); if (!canMove || !date) return; const slot = slots.find(item => item.id === event.dataTransfer.getData("text/plain")); if (slot && slot.etag && !hasPublication(slot, data)) requestMove(slot, date); }}>{date && <><span className="calendar-day-number">{Number(date.slice(-2))}</span>{slots.filter(slot => slot.localDate === date).map(slot => {
    const state = studyState(data, slot); const tint = ["approved", "scheduled", "published"].includes(state) ? "approved" : state === "not started" ? "not-started" : "pending";
    const movable = canMove && !!slot.etag && !hasPublication(slot, data);
    return <button key={slot.id} data-slot-id={slot.id} draggable={movable} onDragStart={event => { if (!movable) { event.preventDefault(); return; } event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", slot.id); }} className={`calendar-study calendar-study-${tint} ${selected?.id === slot.id ? "selected" : ""}`} onClick={() => selectSlot(slot)} aria-label={`${studyTitle(slot, data)}, ${longDate(slot.localDate)}, ${state}`}><strong>{timeLabel(slot.localTime)}</strong><small>{studyTitle(slot, data)}</small><span>{statusLabel(state)}</span></button>;
  })}</>}</div>)}</div><p className="fine">Select a study to change its date with the date picker. Published dates stay fixed.</p></section>;
}

export function Studies({ data, session, refresh, route }: { data: WorkspaceData; session: Session; refresh: () => Promise<void>; route: string }) {
  const today = churchToday(data.church.timeZone);
  const [month, setMonth] = useState(today.slice(0, 7)); const [slotId, setSlotId] = useState(""); const [weekStart, setWeekStart] = useState(""); const [view, setView] = useState<"list" | "calendar">("calendar");
  const [moving, setMoving] = useState<{ slot: Slot; date: string } | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const heading = useRef<HTMLHeadingElement>(null); const previousSelection = useRef("");
  const latestData = useRef(data);
  useEffect(() => { latestData.current = data; }, [data]);
  const activeSlots = data.slots.filter(slot => !isInactive(slot)).sort((first, second) => first.localDate.localeCompare(second.localDate) || first.localTime.localeCompare(second.localTime) || first.id.localeCompare(second.id));
  const selected = activeSlots.find(slot => slot.id === slotId); const weeks = monthWeeks(month); const slots = activeSlots.filter(slot => slot.localDate.startsWith(month));
  const capabilities = session.churches.find(item => item.id === data.church.id)?.capabilities ?? [];
  useEffect(() => {
    const restore = () => {
      const currentData = latestData.current;
      const currentSlots = currentData.slots.filter(slot => !isInactive(slot)).sort((first, second) => first.localDate.localeCompare(second.localDate));
      const params = new URLSearchParams(window.location.search); const linked = currentSlots.find(slot => slot.id === params.get("slot"));
      const legacyDate = currentSlots.find(slot => slot.seriesId === params.get("series"))?.localDate;
      const nextMonth = linked?.localDate.slice(0, 7) ?? (validMonth(params.get("month")) ? params.get("month")! : legacyDate?.slice(0, 7) ?? today.slice(0, 7));
      setMonth(nextMonth); setSlotId(linked?.id ?? "");
      const focusDate = linked?.localDate ?? today;
      setWeekStart(monthWeeks(nextMonth).find(week => focusDate >= week.start && focusDate <= week.end)?.start ?? monthWeeks(nextMonth)[0].start);
      const canonical = new URL(window.location.href); canonical.searchParams.set("month", nextMonth); window.history.replaceState(null, "", canonical);
    };
    restore(); window.addEventListener("popstate", restore); return () => window.removeEventListener("popstate", restore);
  }, [data.church.id]);
  useEffect(() => {
    if (!selected) return;
    if (previousSelection.current === `${selected.id}:${selected.localDate}`) return;
    previousSelection.current = `${selected.id}:${selected.localDate}`;
    setMonth(selected.localDate.slice(0, 7)); setWeekStart(monthWeeks(selected.localDate.slice(0, 7)).find(week => selected.localDate >= week.start && selected.localDate <= week.end)!.start);
  }, [selected?.id, selected?.localDate]);
  function updateUrl(nextMonth: string, id?: string) {
    const url = new URL(window.location.href); url.searchParams.set("month", nextMonth); url.searchParams.delete("series");
    if (id) url.searchParams.set("slot", id); else url.searchParams.delete("slot");
    window.history.pushState(null, "", url);
  }
  function selectSlot(slot: Slot) { setSlotId(slot.id); updateUrl(slot.localDate.slice(0, 7), slot.id); }
  function selectMonth(value: string) {
    if (!validMonth(value)) return; setMonth(value); setSlotId(""); previousSelection.current = ""; setWeekStart(monthWeeks(value).find(week => today >= week.start && today <= week.end)?.start ?? monthWeeks(value)[0].start); updateUrl(value);
  }
  function removed() { setSlotId(""); updateUrl(month); setMessage("Study removed from the active workspace."); heading.current?.focus(); }
  function requestMove(slot: Slot, date: string) {
    if (slot.localDate === date || hasPublication(slot, data)) return;
    if (activeSlots.some(item => item.id !== slot.id && item.localDate === date)) { setError("A study already reserves this church date. Choose another date."); return; }
    setError(""); setMoving({ slot, date });
  }
  async function move() {
    if (!moving?.slot.etag) return; setBusy(true); setError("");
    try {
      await api(`/churches/${data.church.id}/slots/${moving.slot.id}`, { method: "PUT", csrf: session.csrfToken, etag: moving.slot.etag, body: { localDate: moving.date, localTime: moving.slot.localTime, timeZone: moving.slot.timeZone, assigneeIds: moving.slot.assigneeIds } });
      setMoving(null); setMessage(`Study moved to ${longDate(moving.date)}. Final approval must be renewed.`); await refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Study could not be moved. Refresh and try again."); } finally { setBusy(false); }
  }
  const selectedPlan = data.plans.find(plan => plan.id === selected?.planId); const selectedContent = data.content.find(content => content.slotId === selected?.id);
  const monthTitle = dateAtNoon(`${month}-01`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  return <><Heading eyebrow="Date-first study planning" title={route === "calendar" ? "Study calendar" : "Create a Study"}>Choose a date, write the study, gain one final approval, then publish.</Heading><h2 ref={heading} tabIndex={-1} className="sr-only">Study dates</h2><div className="month-controls"><button onClick={() => selectMonth(shiftMonth(month, -1))} aria-label="Previous month">←</button><label>Month<input aria-label="Study month" type="month" value={month} onChange={event => selectMonth(event.target.value)} /></label><button onClick={() => selectMonth(shiftMonth(month, 1))} aria-label="Next month">→</button><button onClick={() => selectMonth(churchToday(data.church.timeZone).slice(0, 7))}>This month</button><span>{data.church.timeZone ?? "America/New_York"}</span>{route === "calendar" && <div className="view-toggle" role="group" aria-label="Calendar display"><button className={view === "list" ? "active" : ""} aria-pressed={view === "list"} onClick={() => setView("list")}>List view</button><button className={view === "calendar" ? "active" : ""} aria-pressed={view === "calendar"} onClick={() => setView("calendar")}>Calendar view</button></div>}</div><h2>{monthTitle}</h2>{message && <Notice>{message}</Notice>}{error && <Notice error>{error}</Notice>}{moving && <section className="card"><h2>Move “{studyTitle(moving.slot, data)}”?</h2><p>{longDate(moving.slot.localDate)} → {longDate(moving.date)} · {timeLabel(moving.slot.localTime)} · {moving.slot.timeZone}</p><p>Existing study content is retained. This cancels pending delivery and renews final study approval.</p><div className="actions"><button onClick={() => setMoving(null)} disabled={busy}>Cancel move</button><button className="primary" onClick={() => void move()} disabled={busy}>Confirm move</button></div></section>}{route === "calendar" && view === "calendar" ? <><CalendarBoard data={data} slots={slots} month={month} selected={selected} selectSlot={selectSlot} canMove={capabilities.includes("series:manage") && !busy} requestMove={requestMove} /><SlotSettings key={month} data={data} session={session} refresh={refresh} initialDate={month === today.slice(0, 7) ? today : `${month}-01`} onCreated={id => { setSlotId(id); updateUrl(month, id); }} /></> : <div className="study-weeks">{weeks.map(week => {
    const weekSlots = slots.filter(slot => slot.localDate >= week.start && slot.localDate <= week.end); const pending = weekSlots.filter(slot => !["approved", "scheduled", "published"].includes(studyState(data, slot))).length;
    return <section className="study-week" key={week.start}><h3><button className="week-toggle" aria-expanded={weekStart === week.start} aria-controls={`week-${week.start}`} onClick={() => setWeekStart(weekStart === week.start ? "" : week.start)}><span>Week {week.number} · {shortDate(week.start)}–{shortDate(week.end)}, {month.slice(0, 4)}</span><small>{weekSlots.length} studies · {pending} needing action</small><span aria-hidden="true">{weekStart === week.start ? "−" : "+"}</span></button></h3>{weekStart === week.start && <div id={`week-${week.start}`}><div className="date-grid" data-testid="date-selector">{weekSlots.map(slot => <button data-testid={`date-card-${slot.id}`} key={slot.id} className={`date-card ${selected?.id === slot.id ? "selected" : ""}`} aria-pressed={selected?.id === slot.id} aria-controls="selected-date-panel" onClick={() => selectSlot(slot)}><strong>{shortDate(slot.localDate)}</strong><small>{longDate(slot.localDate)}</small><span>{studyTitle(slot, data)}</span><span className="date-time">{timeLabel(slot.localTime)}</span><span className="date-status">{statusLabel(studyState(data, slot))}</span></button>)}</div>{!weekSlots.length && <p className="muted">No studies planned.</p>}<SlotSettings data={data} session={session} refresh={refresh} initialDate={today >= week.start && today <= week.end ? today : week.start} onCreated={id => { setSlotId(id); updateUrl(month, id); }} /></div>}</section>;
  })}</div>}<section id="selected-date-panel" aria-label="Selected date">{selected ? <><div className="calendar-detail-summary"><strong>{longDate(selected.localDate)} · {timeLabel(selected.localTime)}</strong><span>{studyTitle(selected, data)}</span><small>{selected.timeZone} · {statusLabel(studyState(data, selected))}</small></div><SlotSettings key={`${selected.id}:${selected.localDate}:${selected.etag ?? ""}`} data={data} seriesId={selected.seriesId} session={session} refresh={refresh} slot={selected} /><StudyLifecycleActions slot={selected} data={data} session={session} refresh={refresh} onRemoved={removed} />{selectedPlan && <UnifiedPlanEditor key={`${data.church.id}:${selected.id}`} slot={selected} initialPlan={selectedPlan} initialContent={selectedContent} data={data} session={session} refresh={refresh} />}</> : <Empty title={slotId ? "This study is unavailable" : "Choose a date to begin"}>{slotId ? "The study was removed or you no longer have access." : "Select a study or add a study date. Unsynced writing is kept on this device for recovery."}</Empty>}</section></>;
}
