"use client";

import { useState } from "react";
import type { WorkspaceData } from "../lib/types";
import type { ContentDraft } from "../lib/content";
import { ContentEditor, type ContentEditorProps } from "./content-editor";
import { MemberPhonePreview } from "./member-phone-preview";
import { isInactive } from "../lib/study-dates";
import { CreatorIcon } from "./creator-icons";

export function ContentEditorWithPreview({
  data,
  ...props
}: ContentEditorProps & { data?: WorkspaceData }) {
  const [draft, setDraft] = useState<ContentDraft>(() => {
    const payload = props.initial.head?.payload ?? {};
    return {
      title: String(payload.title ?? ""),
      body: String(payload.body ?? ""),
      reflection: String(payload.reflection ?? ""),
      discussionQuestion: String(payload.discussionQuestion ?? ""),
      application: String(payload.application ?? ""),
      outboundPreview: String(payload.outboundPreview ?? ""),
      referencesText: Array.isArray(payload.references)
        ? payload.references.join("\n")
        : "",
    };
  });
  const church =
    data?.church ??
    props.session.churches.find((item) => item.id === props.churchId);
  const weekStart = new Date(props.slot.localDate + "T12:00:00Z");
  weekStart.setUTCDate(
    weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7),
  );
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  const dates = data?.slots
    .filter(
      (slot) =>
        !isInactive(slot) &&
        slot.seriesId === props.slot.seriesId &&
        slot.localDate >= weekStart.toISOString().slice(0, 10) &&
        slot.localDate <= weekEnd.toISOString().slice(0, 10),
    )
    .sort(
      (a, b) =>
        a.localDate.localeCompare(b.localDate) ||
        a.localTime.localeCompare(b.localTime),
    ) ?? [props.slot];
  return (
    <div className="content-editor-layout">
      <div className="content-editor-main creator-main">
        {(!props.workflow || props.workflowStep === 0) && (
          <div className="creator-planning-header">
            <div className="creator-study-meta">
              <div>
                <span>Study week</span>
                <strong>
                  {data?.series.find(
                    (series) => series.id === props.slot.seriesId,
                  )?.title ?? "Your church’s study"}
                </strong>
              </div>
              <span>
                <CreatorIcon name="calendar" />
                {weekStart.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })}
                –
                {weekEnd.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </span>
            </div>
            <nav className="creator-day-tabs" aria-label="Study days">
              {dates.map((slot) => {
                const date = new Date(slot.localDate + "T12:00:00Z");
                return (
                  <a
                    key={slot.id}
                    href={`?church=${encodeURIComponent(props.churchId)}&slot=${encodeURIComponent(slot.id)}&month=${slot.localDate.slice(0, 7)}#selected-date-panel`}
                    aria-current={
                      slot.id === props.slot.id ? "date" : undefined
                    }
                  >
                    <span>
                      {date.toLocaleDateString("en-US", {
                        weekday: "short",
                        timeZone: "UTC",
                      })}
                    </span>
                    <strong>{date.getUTCDate()}</strong>
                    {slot.id === props.slot.id && <i />}
                  </a>
                );
              })}
            </nav>
          </div>
        )}
        <ContentEditor {...props} onDraftChange={setDraft} />
      </div>
      <MemberPhonePreview
        draft={draft}
        churchName={church?.name ?? "Your church"}
        logoUrl={church?.theme?.logoUrl}
      />
    </div>
  );
}
