"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api, type Session } from "../lib/api";
import type { Aggregate, Slot, Member } from "../lib/types";
import { statusLabel } from "../lib/types";
import { Badge, Notice } from "./ui";
import { RevisionComments } from "./plan-editor";
import { contentPayload, type ContentDraft } from "../lib/content";
import { AIAssistance } from "./ai-assistance";
import { canEditStudy } from "../lib/study-permissions";
import { legacyRecoveryKey } from "../lib/drafts";
import { StudyComposer } from "./study-composer";
import { StudyCowriter } from "./study-cowriter";

const fields = [
  ["title", "Study title", "title"],
  ["body", "Study body", "body"],
  ["reflection", "Reflection", "reflection"],
  ["discussionQuestion", "Discussion question", "question"],
  ["application", "Application", "application"],
  [
    "referencesText",
    "Scripture references & source links · one per line",
    "references",
  ],
  ["outboundPreview", "Message preview", "preview"],
] as const;

function draftFromContent(aggregate: Aggregate): ContentDraft {
  return Object.fromEntries(
    fields.map(([field]) => [
      field,
      field === "referencesText"
        ? Array.isArray(aggregate.head?.payload.references)
          ? aggregate.head.payload.references.join("\n")
          : ""
        : String(aggregate.head?.payload[field] ?? ""),
    ]),
  ) as ContentDraft;
}

export type ContentEditorProps = {
  initial: Aggregate;
  plan: Aggregate;
  slot: Slot;
  churchId: string;
  session: Session;
  refresh: () => Promise<void>;
  workflow?: boolean;
  onDraftChange?: (draft: ContentDraft) => void;
  onAggregateChange?: (aggregate: Aggregate) => void;
  beforeSubmit?: () => Promise<boolean>;
  workflowStep?: number;
  onWorkflowStepChange?: (step: number) => void;
};
type ReviewData = {
  request: {
    approverId: string;
    approverName?: string;
    revisionId: string;
    status: string;
  } | null;
  approvers: Member[];
};

export function ContentEditor({
  initial,
  plan,
  slot,
  churchId,
  session,
  refresh,
  workflow = false,
  onDraftChange,
  onAggregateChange,
  beforeSubmit,
  workflowStep = 0,
  onWorkflowStepChange,
}: ContentEditorProps) {
  const [content, setContent] = useState(initial);
  const [assist, setAssist] = useState(false);
  const [adoptionUndo, setAdoptionUndo] = useState<ContentDraft | null>(null);
  const [draft, setDraft] = useState<ContentDraft>(() =>
    draftFromContent(initial),
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(
    initial.head ? "Study draft saved to backend" : "No study draft saved yet",
  );
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState(false);
  const [history, setHistory] = useState(false);
  const [conflict, setConflict] = useState<Aggregate | null>(null);
  const prefix = `/churches/${churchId}/content/${content.id}`;
  const draftRef = useRef(draft);
  const saveRef = useRef<Promise<Aggregate | null> | null>(null);
  const headRef = useRef(content);
  const dirtyRef = useRef(false);
  const conflictRef = useRef(false);
  const mounted = useRef(true);
  const saveAttempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [approverId, setApproverId] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  useEffect(() => {
    onDraftChange?.(draft);
  }, [draft, onDraftChange]);
  useEffect(() => {
    onAggregateChange?.(content);
  }, [content, onAggregateChange]);
  useEffect(() => {
    if (!workflow) return;
    let active = true;
    api<ReviewData>(prefix + "/review-request")
      .then((result) => {
        if (active) setReview(result.data);
      })
      .catch((failure) => {
        if (active) {
          setReview(null);
          setError(
            failure instanceof Error
              ? failure.message
              : "Approvers could not be loaded. Refresh to try again.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [workflow, prefix, content.version]);
  const eligibleApprovers =
    review?.approvers.filter(
      (member) =>
        member.active !== false &&
        member.userId !== session.user.id &&
        member.capabilities.includes("workspace:read") &&
        member.capabilities.includes("content:approve"),
    ) ?? [];

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, []);
  const capabilities =
    session.churches.find((church) => church.id === churchId)?.capabilities ??
    [];
  const canEdit = canEditStudy(
    capabilities,
    slot,
    session.user.id,
    "content:edit",
  );
  const key = `rooted:draft:${session.user.id}:${churchId}:content:${content.id}`;
  const legacyKey = legacyRecoveryKey(key);
  const [recovery, setRecovery] = useState<{
    draft: ContentDraft;
    baseRevisionId: string | null;
    base?: Record<string, unknown>;
  } | null>(null);
  const [conflictBase, setConflictBase] = useState<Record<
    string,
    unknown
  > | null>(null);
  useEffect(() => {
    if (initial.version <= headRef.current.version) return;
    if (dirtyRef.current || saveRef.current) {
      setConflictBase(headRef.current.head?.payload ?? null);
      conflictRef.current = true;
      setConflict(initial);
    } else {
      headRef.current = initial;
      setContent(initial);
      const next = draftFromContent(initial);
      draftRef.current = next;
      setDraft(next);
      setStatus("Current backend content revision loaded");
    }
  }, [initial]);
  useEffect(() => {
    try {
      const current = localStorage.getItem(key);
      const source = current ? key : legacyKey;
      const local = JSON.parse(
        current ??
          (legacyKey ? localStorage.getItem(legacyKey) : null) ??
          "null",
      );
      if (
        local &&
        typeof local.savedAt === "number" &&
        local.savedAt <= Date.now() &&
        Date.now() - local.savedAt < 86400000 &&
        local.draft &&
        fields.every(([field]) => typeof local.draft[field] === "string")
      ) {
        setRecovery(local);
        if (source !== key) {
          localStorage.setItem(key, JSON.stringify(local));
          if (source) localStorage.removeItem(source);
        }
      } else if (source) localStorage.removeItem(source);
    } catch {
      localStorage.removeItem(key);
      if (legacyKey) localStorage.removeItem(legacyKey);
    }
  }, [key, legacyKey]);
  function edit(field: string, value: string) {
    const next = { ...draftRef.current, [field]: value };
    draftRef.current = next;
    dirtyRef.current = true;
    setDraft(next);
    setDirty(true);
    setStatus("Saved on this device; not synced");
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          draft: next,
          savedAt: Date.now(),
          baseRevisionId: headRef.current.headRevisionId,
          base: headRef.current.head?.payload,
        }),
      );
    } catch {
      setStatus("Unsaved · device storage unavailable");
    }
  }
  const save = useCallback(async (): Promise<Aggregate | null> => {
    if (saveRef.current) return saveRef.current;
    if (!mounted.current || conflictRef.current) return null;
    if (!dirtyRef.current) return headRef.current;
    const candidate = draftRef.current;
    const base = headRef.current;
    const body = {
      baseRevisionId: base.headRevisionId,
      planApprovalId: plan.approvalId,
      payload: contentPayload(candidate, base.head?.payload),
    };
    const fingerprint = JSON.stringify({ etag: base.etag, body });
    if (saveAttempt.current?.fingerprint !== fingerprint)
      saveAttempt.current = { fingerprint, key: crypto.randomUUID() };
    setStatus("Saving full-study content…");
    const pending = (async () => {
      try {
        const result = await api<Aggregate>(prefix + "/revisions", {
          method: "POST",
          csrf: session.csrfToken,
          etag: base.etag,
          key: saveAttempt.current?.key,
          body,
        });
        headRef.current = result.data;
        saveAttempt.current = null;
        const savedLatest =
          JSON.stringify(candidate) === JSON.stringify(draftRef.current);
        if (savedLatest) dirtyRef.current = false;
        if (mounted.current) {
          setContent(result.data);
          if (savedLatest) {
            setDirty(false);
            localStorage.removeItem(key);
            if (legacyKey) localStorage.removeItem(legacyKey);
          }
          setStatus("Full-study content saved to backend");
        }
        return result.data;
      } catch (failure) {
        if (mounted.current) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Content could not be saved.",
          );
          setStatus("Saved on this device; not synced");
          if (
            failure instanceof Error &&
            "status" in failure &&
            [409, 412].includes(Number(failure.status))
          ) {
            conflictRef.current = true;
            setConflictBase(base.head?.payload ?? null);
            try {
              const latest = await api<Aggregate>(prefix);
              if (mounted.current) setConflict(latest.data);
            } catch (lookupFailure) {
              if (mounted.current)
                setError(
                  lookupFailure instanceof Error
                    ? lookupFailure.message
                    : "Latest content revision could not be loaded.",
                );
            }
          }
        }
        return null;
      } finally {
        saveRef.current = null;
      }
    })();
    saveRef.current = pending;
    return pending;
  }, [prefix, session.csrfToken, plan.approvalId, key, legacyKey]);
  useEffect(() => {
    if (!dirty || conflict) return;
    const timer = setTimeout(() => void save(), 900);
    return () => clearTimeout(timer);
  }, [draft, dirty, conflict, save]);
  async function command(action: string, extras: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    try {
      if (
        action === "/submit" &&
        workflow &&
        !eligibleApprovers.some((member) => member.userId === approverId)
      )
        throw new Error("Choose an eligible approver before submitting.");
      if (action === "/submit" && beforeSubmit && !(await beforeSubmit()))
        throw new Error("Save the study before submitting it for approval.");
      let current = await save();
      while (
        mounted.current &&
        current &&
        dirtyRef.current &&
        !conflictRef.current
      )
        current = await save();
      if (!mounted.current || !current || conflictRef.current) return;
      const commandBody =
        action === "/submit"
          ? {
              revisionId: current.headRevisionId,
              ...(workflow ? { approverId, note: reviewNote } : {}),
            }
          : action === "/decisions"
            ? {
                revisionId: current.headRevisionId,
                expectedHash: current.head?.hash,
                ...extras,
              }
            : {
                revisionId: current.headRevisionId,
                approvalId: current.approvalId,
                ...extras,
              };
      const result = await api<Aggregate>(prefix + action, {
        method: "POST",
        csrf: session.csrfToken,
        etag: current.etag,
        body: commandBody,
      });
      if (action !== "/schedules") {
        headRef.current = result.data;
        setContent(result.data);
      } else {
        const latest = await api<Aggregate>(prefix);
        headRef.current = latest.data;
        setContent(latest.data);
      }
      setStatus(
        action === "/publish"
          ? "Published snapshot saved to backend"
          : action === "/schedules"
            ? "Publication scheduled on backend"
            : "Full-study workflow updated",
      );
      await refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The action could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }
  function advanceWorkflow() {
    if (!onWorkflowStepChange) return;
    if (
      workflowStep === 1 &&
      ["draft", "changes_requested"].includes(content.status)
    ) {
      void command("/submit");
      return;
    }
    if (workflowStep === 1 && content.status === "in_review") return;
    onWorkflowStepChange(Math.min(2, workflowStep + 1));
  }
  return (
    <section
      className="content-section"
      data-workflow-step={workflow ? workflowStep : undefined}
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            Step {workflowStep + 1} ·{" "}
            {["Create Study", "Gain Approval", "Publish Study"][workflowStep]}
          </p>
          <h2>
            {workflowStep === 0
              ? "Bring the study to life."
              : workflowStep === 1
                ? "Gain approval for the study."
                : "Publish the study."}
          </h2>
        </div>
        <Badge>Study {statusLabel(content.status)}</Badge>
      </div>
      <div
        className="creator-editing-area"
        hidden={workflow && workflowStep !== 0}
      >
        <div className="card study-draft-card creator-editor-card">
          <div className="card-top">
            <div>
              <p className="eyebrow">Your selected study day</p>
              <h2>{draft.title || "Shape today’s study"}</h2>
            </div>
            <span className="save-status" role="status" aria-live="polite">
              {status}
            </span>
          </div>
          <p className="muted">
            Shape the scripture, reflection, and next step for this day.
          </p>
          {error && <Notice error>{error}</Notice>}
          {recovery && (
            <Notice>
              <p>
                Locally recovered content · not synced. Expires after 24 hours.
              </p>
              <button
                onClick={() => {
                  if (
                    recovery.baseRevisionId !== headRef.current.headRevisionId
                  ) {
                    conflictRef.current = true;
                    setConflictBase(recovery.base ?? null);
                    setConflict(headRef.current);
                  }
                  draftRef.current = recovery.draft;
                  setDraft(recovery.draft);
                  dirtyRef.current = true;
                  setDirty(true);
                  setRecovery(null);
                }}
              >
                Restore local content
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem(key);
                  setRecovery(null);
                }}
              >
                Keep backend content
              </button>
            </Notice>
          )}
          {conflict && (
            <Notice error>
              <h3>A newer content revision exists.</h3>
              <div className="diff-grid">
                <div>
                  <strong>Base revision</strong>
                  <pre>{JSON.stringify(conflictBase, null, 2)}</pre>
                </div>
                <div>
                  <strong>Your writing</strong>
                  <pre>{JSON.stringify(draft, null, 2)}</pre>
                </div>
                <div>
                  <strong>Latest server revision</strong>
                  <pre>{JSON.stringify(conflict.head?.payload, null, 2)}</pre>
                </div>
              </div>
              <p>
                Edit the fields below to resolve differences, then save a new
                draft.
              </p>
              <button
                onClick={() => {
                  headRef.current = conflict;
                  setContent(conflict);
                  conflictRef.current = false;
                  setConflict(null);
                  dirtyRef.current = true;
                  setDirty(true);
                }}
              >
                Use resolved fields against latest revision
              </button>
            </Notice>
          )}
          <StudyComposer
            key={content.id}
            draft={draft}
            edit={edit}
            disabled={!canEdit || busy}
          />
          <div className="footer-actions">
            <button onClick={() => setPreview(!preview)}>
              {preview ? "Close reading preview" : "Preview reading"}
            </button>
            <div className="actions">
              <button onClick={() => void save()} disabled={!dirty || busy}>
                Save content
              </button>
              {!workflow && (
                <button
                  data-testid="content-submit"
                  className="primary"
                  disabled={
                    !canEdit ||
                    busy ||
                    content.status === "in_review" ||
                    !!conflict
                  }
                  onClick={() => void command("/submit")}
                >
                  Submit full study for review
                </button>
              )}
            </div>
          </div>
          <div className="actions">
            <button
              className="text-button"
              onClick={() => setHistory(!history)}
            >
              Content revisions & comments
            </button>
            {!workflow && (
              <button
                className="text-button"
                aria-expanded={assist}
                onClick={() => setAssist(!assist)}
              >
                Ask AI for full-study assistance
              </button>
            )}
            {adoptionUndo && (
              <button
                className="text-button"
                onClick={() => {
                  draftRef.current = adoptionUndo;
                  setDraft(adoptionUndo);
                  dirtyRef.current = true;
                  setDirty(true);
                  try {
                    localStorage.setItem(
                      key,
                      JSON.stringify({
                        draft: adoptionUndo,
                        savedAt: Date.now(),
                        baseRevisionId: headRef.current.headRevisionId,
                        base: headRef.current.head?.payload,
                      }),
                    );
                  } catch {
                    setStatus("Unsaved · device storage unavailable");
                  }
                  setAdoptionUndo(null);
                }}
              >
                Undo last content AI adoption as a new draft
              </button>
            )}
          </div>
          {preview && (
            <article className="reading-preview">
              <Badge>Unpublished staff preview</Badge>
              <h1>{draft.title || "Untitled study"}</h1>
              <p>{draft.body}</p>
              <h2>Reflect</h2>
              <p>{draft.reflection}</p>
              <h2>Discuss</h2>
              <p>{draft.discussionQuestion}</p>
              <h2>Put it into practice</h2>
              <p>{draft.application}</p>
            </article>
          )}
        </div>
        <StudyCowriter
          key={`${session.user.id}:${churchId}:${content.id}:${slot.localDate}`}
          churchId={churchId}
          study={content}
          session={session}
          unsaved={dirty || !!conflict}
          prepare={() => {
            if (dirtyRef.current || conflictRef.current || saveRef.current) throw new Error("Save or resolve your editor changes first.");
            return headRef.current;
          }}
          onAdopt={(current) => {
            if (dirtyRef.current) {
              setConflict(current);
              conflictRef.current = true;
              setStatus("Proposal saved; resolve your newer local edits before continuing.");
              return;
            }
            setAdoptionUndo({ ...draftRef.current });
            headRef.current = current;
            setContent(current);
            const next = draftFromContent(current);
            draftRef.current = next;
            setDraft(next);
            setStatus("Co-writer proposal adopted as a new saved draft revision");
          }}
          active={!workflow || workflowStep === 0}
          title={draft.title}
          date={new Date(slot.localDate + "T12:00:00Z").toLocaleDateString(
            "en-US",
            {
              weekday: "long",
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            },
          )}
        />
      </div>
      {assist && (
        <AIAssistance
          mode="proposal"
          churchId={churchId}
          aggregate={content}
          session={session}
          unsaved={dirty}
          prepare={async () => {
            let current = await save();
            while (
              mounted.current &&
              current &&
              dirtyRef.current &&
              !conflictRef.current
            )
              current = await save();
            return mounted.current ? current : null;
          }}
          onAdopt={(current) => {
            setAdoptionUndo({ ...draftRef.current });
            headRef.current = current;
            setContent(current);
            const next = draftFromContent(current);
            draftRef.current = next;
            setDraft(next);
            dirtyRef.current = false;
            setDirty(false);
            setStatus(
              "Adopted content field saved as a new backend draft revision",
            );
          }}
        />
      )}
      {workflow && (
        <section
          className="card review-assignment"
          aria-labelledby="study-approval-heading"
        >
          <p className="eyebrow">Step 2 · Gain Approval</p>
          <h2 id="study-approval-heading">One final study approval</h2>
          {review?.request && (
            <p className="muted">
              {review.request.status === "pending"
                ? `Waiting for ${review.request.approverName ?? "the selected approver"}.`
                : `Review: ${statusLabel(review.request.status)}`}
            </p>
          )}
          {["draft", "changes_requested"].includes(content.status) ? (
            <>
              <p>
                Save your completed study and choose another active contributor
                with approval permission.
              </p>
              <fieldset disabled={!canEdit || busy}>
                <label htmlFor="study-approver">Approver</label>
                <select
                  id="study-approver"
                  value={approverId}
                  onChange={(event) => setApproverId(event.target.value)}
                >
                  <option value="">Select an approver</option>
                  {eligibleApprovers.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
                <label htmlFor="study-review-note">
                  Note for approver (optional)
                </label>
                <textarea
                  id="study-review-note"
                  value={reviewNote}
                  maxLength={10000}
                  onChange={(event) => setReviewNote(event.target.value)}
                />
              </fieldset>
              {review && !eligibleApprovers.length && (
                <p className="fine">
                  No eligible approver is available. Ask an administrator to
                  invite another contributor with study approval permission.
                </p>
              )}
              <button
                data-testid="content-submit"
                className="primary"
                disabled={
                  !canEdit ||
                  busy ||
                  !!conflict ||
                  !eligibleApprovers.some(
                    (member) => member.userId === approverId,
                  )
                }
                onClick={() => void command("/submit")}
              >
                {busy ? "Submitting…" : "Submit study for approval"}
              </button>
              <p className="fine">
                Pending saves finish before the latest exact revision is
                submitted.
              </p>
            </>
          ) : (
            <p>
              {content.status === "in_review"
                ? "The assigned approver reviews this exact saved revision."
                : "Final study approval is complete."}
            </p>
          )}
        </section>
      )}
      {workflow && workflowStep === 1 && content.status === "in_review" && (
        <section className="card review-panel">
          <p className="eyebrow">Final study review</p>
          <h2>Approve the words members will read.</h2>
          <p>
            Content revision {content.head?.number} ·{" "}
            <code>{content.head?.hash}</code>
          </p>
          <label htmlFor="content-reason">
            Review notes / reason for changes
          </label>
          <textarea
            id="content-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <div className="actions">
            <button
              disabled={
                busy ||
                !reason.trim() ||
                !capabilities.includes("content:approve") ||
                (workflow && review?.request?.approverId !== session.user.id)
              }
              onClick={() =>
                void command("/decisions", {
                  decision: "request_changes",
                  reason,
                })
              }
            >
              Request content changes
            </button>
            <button
              data-testid="content-approve"
              className="primary"
              disabled={
                busy ||
                !capabilities.includes("content:approve") ||
                (workflow && review?.request?.approverId !== session.user.id)
              }
              onClick={() =>
                void command("/decisions", { decision: "approve", reason })
              }
            >
              Approve full-study revision {content.head?.number}
            </button>
          </div>
        </section>
      )}
      <section
        className="card publish-study-card"
        aria-labelledby="study-publish-heading"
      >
        <p className="eyebrow">Step 3 · Publish Study</p>
        <h2 id="study-publish-heading">Share with your church.</h2>
        {["approved", "scheduled", "published"].includes(content.status) ? (
          <>
            <p>
              {content.status === "published"
                ? "Published study. Its exact historical snapshot is retained."
                : content.status === "scheduled"
                  ? `Delivery scheduled for ${slot.localDate} · ${slot.localTime} · ${slot.timeZone}.`
                  : `Approved revision ${content.head?.number}. Publish now or schedule delivery.`}
            </p>
            <div className="actions">
              {content.status === "approved" && (
                <button
                  disabled={
                    busy || !capabilities.includes("publication:schedule")
                  }
                  onClick={() =>
                    void command("/schedules", {
                      localDate: slot.localDate,
                      localTime: slot.localTime,
                      timeZone: slot.timeZone,
                      destinationId: "web",
                    })
                  }
                >
                  Schedule {slot.localDate} · {slot.localTime}
                </button>
              )}
              {content.status !== "published" && (
                <>
                  <button
                    data-testid="publish-study"
                    className="primary"
                    disabled={
                      busy || !capabilities.includes("publication:schedule")
                    }
                    onClick={() => void command("/publish")}
                  >
                    Publish approved study now
                  </button>
                  <button
                    disabled={
                      busy || !capabilities.includes("publication:schedule")
                    }
                    onClick={() => void command("/publish-once")}
                  >
                    Deliver once published
                  </button>
                </>
              )}
            </div>
            {content.livePublicationId && (
              <a
                className="button"
                href={`/c/${session.churches.find((church) => church.id === churchId)?.slug}/studies/${content.livePublicationId}`}
              >
                Read published study →
              </a>
            )}
          </>
        ) : (
          <p className="muted">
            Publication unlocks after final study approval. A past delivery date
            never blocks approval or an authorized Publish now action.
          </p>
        )}
      </section>
      {history && (
        <RevisionComments
          prefix={prefix}
          aggregate={content}
          session={session}
        />
      )}
      {workflow && onWorkflowStepChange && (
        <div
          className="workflow-navigation"
          aria-label="Study workflow navigation"
        >
          {workflowStep > 0 && (
            <button
              type="button"
              onClick={() => onWorkflowStepChange(workflowStep - 1)}
            >
              Back
            </button>
          )}
          {workflowStep < 2 && (
            <button
              type="button"
              className="primary"
              disabled={
                busy ||
                (workflowStep === 1 &&
                  (content.status === "in_review" ||
                    (["draft", "changes_requested"].includes(content.status) &&
                      !eligibleApprovers.some(
                        (member) => member.userId === approverId,
                      ))))
              }
              onClick={advanceWorkflow}
            >
              {workflowStep === 0
                ? "Next: Gain Approval"
                : content.status === "in_review"
                  ? "Awaiting Approval"
                  : content.status === "approved"
                    ? "Next: Publish Study"
                    : "Submit for Approval"}
            </button>
          )}
          {workflowStep === 2 && (
            <button type="button" disabled>
              End of workflow
            </button>
          )}
        </div>
      )}
    </section>
  );
}
