import type { Church } from "./api";

export type Revision = { id: string; number: number; hash: string; authorId: string; payload: Record<string, unknown> & { title?: string }; planApprovalId?: string; createdAt: string };
export type Aggregate = { id: string; kind: string; slotId: string; planId: string | null; status: string; version: number; etag: string; headRevisionId: string | null; head: Revision | null; approvalId: string | null; livePublicationId?: string | null };
export type Slot = { id: string; seriesId: string; localDate: string; localTime: string; timeZone: string; assigneeIds: string[]; planId: string; etag?: string; version?: number; lifecycleVersion?: number; everPublished?: boolean; publishedAt?: string | null; withdrawn?: boolean; withdrawnAt?: string | null; deleted?: boolean; deletedAt?: string | null; lifecycle?: string };
export type Series = { id: string; title: string; weekAnchor: string; timeZone: string; sermonIds: string[] };
export type Sermon = { id: string; title: string; preachedDate: string; speaker: string; passages: string[]; notes: string; createdAt: string };
export type Member = { userId: string; displayName: string; capabilities: string[]; active?: boolean };
export type WorkspaceData = { church: Church; members: Member[]; sermons: Sermon[]; series: Series[]; slots: Slot[]; plans: Aggregate[]; content: Aggregate[]; notifications: { id: string; message?: string; type?: string; createdAt: string }[]; integrations: Record<string, unknown> };
export const statusLabel = (status?: string) => status ? status.replaceAll("_", " ") : "not started";
export const longDate = (date: string) => new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`));
export const shortDate = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
export const timeLabel = (time: string) => { const [hours, minutes] = time.split(":").map(Number); return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`; };
