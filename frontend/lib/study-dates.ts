import type { Slot, WorkspaceData } from "./types";

export function churchToday(timeZone = "America/New_York", now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export const dateAtNoon = (date: string) => new Date(`${date}T12:00:00Z`);
export const dateKey = (date: Date) => date.toISOString().slice(0, 10);
export const validMonth = (month: string | null): month is string => Boolean(month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month));
export function shiftMonth(month: string, offset: number) {
  const date = dateAtNoon(`${month}-01`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return dateKey(date).slice(0, 7);
}

export function monthWeeks(month: string) {
  const first = dateAtNoon(`${month}-01`);
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12));
  const weeks: { number: number; start: string; end: string }[] = [];
  let start = first;
  while (start <= last) {
    const end = new Date(start);
    end.setUTCDate(Math.min(last.getUTCDate(), start.getUTCDate() + 6 - start.getUTCDay()));
    weeks.push({ number: weeks.length + 1, start: dateKey(start), end: dateKey(end) });
    start = new Date(end);
    start.setUTCDate(start.getUTCDate() + 1);
  }
  return weeks;
}

export function hasPublication(slot: Slot, data: Pick<WorkspaceData, "content">) {
  return Boolean(slot.everPublished || slot.publishedAt || slot.withdrawnAt || data.content.some(content => content.slotId === slot.id && (content.status === "published" || content.livePublicationId)));
}

export const isWithdrawn = (slot: Slot) => Boolean(slot.withdrawn || slot.withdrawnAt || slot.lifecycle === "withdrawn");
export const isInactive = (slot: Slot) => Boolean(slot.deleted || slot.deletedAt || isWithdrawn(slot) || slot.lifecycle === "deleted");
export const studyTitle = (slot: Slot, data: WorkspaceData) => data.content.find(item => item.slotId === slot.id)?.head?.payload.title || data.plans.find(item => item.id === slot.planId)?.head?.payload.title || "Untitled study";
