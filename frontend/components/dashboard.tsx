"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, type Session } from "../lib/api";
import type { WorkspaceData } from "../lib/types";
import { longDate, shortDate, statusLabel, timeLabel } from "../lib/types";
import { Badge, Heading, Notice } from "./ui";

type Summary = {
  week: { start: string; end: string; timeZone: string; scope: string };
  readiness: { plannedCount: number; readyCount: number; pendingReviewCount: number; assignedReviewCount: number; readyToPublishCount: number; scheduledCount: number; publicationIssueCount: number };
  studies: { studyId: string; contentId: string | null; seriesId: string; localDate: string; localTime: string; timeZone: string; title: string; status: string; livePublicationId: string | null }[];
  engagement: { publicationId: string; title: string; publishedAt: string; audienceMemberCount: number | null; uniqueAudienceOpens: number | null; uniqueOpens: number; additionalMemberOpens: number; openPercent: number | null; reactions: Record<string, number>; discussionTotals: Record<string, number>; questionsNeedingAnswer: number; trackingState: string; trackingRetiredAt: string | null } | null;
  engagementAllowed: boolean;
  asOf: string;
};

function moveDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10);
}

export function Dashboard({ data }: { data: WorkspaceData; session: Session; refresh: () => Promise<void> }) {
  const [weekStart, setWeekStart] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const load = useCallback(async () => {
    const response = await api<Summary>(`/churches/${data.church.id}/dashboard${weekStart ? `?weekStart=${weekStart}` : ""}`);
    return response.data;
  }, [data.church.id, weekStart]);
  useEffect(() => {
    let current = true;
    async function update() {
      setBusy(true); setError("");
      try { const next = await load(); if (current) setSummary(next); }
      catch (failure) { if (current) setError(failure instanceof Error ? failure.message : "Dashboard could not be loaded."); }
      finally { if (current) setBusy(false); }
    }
    void update(); window.addEventListener("focus", update);
    return () => { current = false; window.removeEventListener("focus", update); };
  }, [load, data, retry]);
  const route = (study?: Summary["studies"][number]) => `/studies?church=${data.church.id}${study ? `&slot=${study.studyId}&series=${study.seriesId}&month=${study.localDate.slice(0, 7)}` : ""}`;
  const review = summary?.studies.find(study => study.status === "in_review");
  const publish = summary?.studies.find(study => study.status === "approved");
  const engagement = summary?.engagement;
  const engagementLink = (filter?: string) => `/engagement?church=${data.church.id}${engagement ? `&publication=${engagement.publicationId}` : ""}${filter ? `&filter=${filter}` : ""}`;
  return <>
    <Heading eyebrow={data.church.name} title="A clear next step for your week." action={<Link className="button primary" href={route()}>Create a Study →</Link>}>Prepare your studies. See how your church is responding.</Heading>
    {error && <Notice error>{error} <button onClick={() => setRetry(current => current + 1)}>Retry dashboard</button></Notice>}
    {!summary ? <p role="status">{busy ? "Loading your church dashboard…" : "Your dashboard is unavailable."}</p> : <>
      <section aria-labelledby="preparation-heading" aria-busy={busy}>
        <div className="card-top"><div><h2 id="preparation-heading">Study Preparation</h2><p className="muted">{summary.week.scope} · {shortDate(summary.week.start)}–{shortDate(summary.week.end)} · {summary.week.timeZone}</p></div><div className="actions"><button aria-label="Previous week" onClick={() => setWeekStart(moveDays(summary.week.start, -7))}>←</button><button onClick={() => setWeekStart("")}>This week</button><button aria-label="Next week" onClick={() => setWeekStart(moveDays(summary.week.start, 7))}>→</button></div></div>
        <div className="metric-grid">
          <section className="card metric"><p className="eyebrow">Weekly Readiness</p><div className="stat">{summary.readiness.readyCount}<span> / {summary.readiness.plannedCount}</span></div><p className="muted">{summary.readiness.plannedCount ? "Final studies approved, scheduled or published" : "No studies planned this week"}</p><Link className="inline-link" href={route(summary.studies[0])}>Open this week →</Link></section>
          <section className="card metric"><p className="eyebrow">Review Queue</p><div className="stat">{summary.readiness.pendingReviewCount}</div><p className="muted">Awaiting approval · {summary.readiness.assignedReviewCount} assigned to you</p><Link className="inline-link" href={route(review)}>Review studies →</Link></section>
          <section className="card metric"><p className="eyebrow">Publication Readiness</p><div className="stat">{summary.readiness.readyToPublishCount}</div><p className="muted">Ready to publish · {summary.readiness.scheduledCount} scheduled{summary.readiness.publicationIssueCount ? ` · ${summary.readiness.publicationIssueCount} need attention` : ""}</p><Link className="inline-link" href={route(publish)}>Open publication →</Link></section>
        </div>
        <section className="card"><div className="card-top"><h2>Your week, at a glance</h2><Badge>{summary.studies.length} study dates</Badge></div>{summary.studies.length ? summary.studies.map(study => <Link className="schedule-row" key={study.studyId} href={route(study)}><div className="calendar-date"><span>{new Date(`${study.localDate}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}</span><strong>{study.localDate.slice(-2)}</strong></div><div><strong>{study.title}</strong><small>{longDate(study.localDate)} · {timeLabel(study.localTime)}</small>{study.livePublicationId && study.status !== "published" && <small>An earlier approved publication remains live</small>}</div><Badge>{statusLabel(study.status)}</Badge></Link>) : <p className="muted">No studies planned for these dates. <Link className="inline-link" href={route()}>Add a study →</Link></p>}</section>
      </section>
      <section aria-labelledby="engagement-heading"><div className="card-top"><div><h2 id="engagement-heading">Member Engagement</h2><p className="muted">{engagement ? `${engagement.title} · Published ${new Date(engagement.publishedAt).toLocaleDateString()} · Latest published study` : "A view of how your church responds to published studies."}</p></div>{summary.engagementAllowed && <Link className="button" href={engagementLink()}>View Study Engagement →</Link>}</div>
        {!summary.engagementAllowed ? <Notice>Your account does not include member engagement access.</Notice> : !engagement ? <section className="card"><p className="muted">No published studies yet. Member engagement will appear after a study is shared.</p></section> : <><div className="metric-grid">
          <section className="card metric"><p className="eyebrow">Members opened</p><div className="stat">{engagement.uniqueAudienceOpens ?? engagement.uniqueOpens}{engagement.audienceMemberCount !== null && <span> / {engagement.audienceMemberCount}</span>}</div><p className="muted">{engagement.audienceMemberCount === null ? "Audience not recorded for this historical study" : `Unique opens · ${engagement.openPercent === null ? "No audience percentage" : `${engagement.openPercent}% of audience`}`}</p>{engagement.additionalMemberOpens > 0 && <small>+{engagement.additionalMemberOpens} readers who joined later</small>}</section>
          <section className="card metric"><p className="eyebrow">Positive reactions</p><div className="stat">{Object.values(engagement.reactions).reduce((total, count) => total + count, 0)}</div><p className="muted">{engagement.reactions.like ?? 0} Likes · {engagement.reactions.fire ?? 0} Inspired · {engagement.reactions.thankful} Thankful · {engagement.reactions.encouraged} Encouraged · {engagement.reactions.praying} Praying</p></section>
          <section className="card metric"><p className="eyebrow">Questions needing an answer</p><div className="stat">{engagement.questionsNeedingAnswer}</div><p className="muted">Approved member questions waiting for your team</p><Link className="inline-link" href={engagementLink("unanswered")}>Answer a question →</Link></section>
        </div><p className="fine">{engagement.discussionTotals.pending} comments pending review · {engagement.discussionTotals.declined} declined · Opens measure opening, not reading completion.{engagement.trackingState === "retired" ? " Tracking closed after 90 days; counts are preserved totals." : ""}</p></>}
      </section><p className="fine">Updated {new Date(summary.asOf).toLocaleString()} · Refreshes when you return to this window.</p>
    </>}
  </>;
}
