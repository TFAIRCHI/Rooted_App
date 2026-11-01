"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Session } from "../lib/api";
import type { Aggregate, Slot, WorkspaceData } from "../lib/types";
import { Notice } from "./ui";
import { ContentEditorWithPreview } from "./content-editor-with-preview";
import { canEditStudy } from "../lib/study-permissions";

export function UnifiedPlanEditor({
  slot,
  initialPlan,
  initialContent,
  data,
  session,
  refresh,
}: {
  slot: Slot;
  initialPlan: Aggregate;
  initialContent?: Aggregate;
  data: WorkspaceData;
  session: Session;
  refresh: () => Promise<void>;
}) {
  const [content, setContent] = useState(initialContent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const capabilities =
    session.churches.find((church) => church.id === data.church.id)
      ?.capabilities ?? [];
  const canCreate = canEditStudy(
    capabilities,
    slot,
    session.user.id,
    "content:edit",
  );
  const currentContent =
    initialContent && (!content || initialContent.version > content.version)
      ? initialContent
      : content;
  const status = currentContent?.status ?? "draft";
  const step =
    status === "in_review"
      ? 1
      : ["approved", "scheduled", "published"].includes(status)
        ? 2
        : 0;
  const [workflowStep, setWorkflowStep] = useState(step);
  useEffect(() => {
    setWorkflowStep((current) => Math.max(current, step));
  }, [step]);
  const beforeSubmit = useCallback(async () => {
    return true;
  }, []);
  async function createStudy() {
    setBusy(true);
    setError("");
    try {
      const plan = initialPlan;
      if (!plan)
        throw new Error(
          "The study plan is unavailable. Refresh and try again.",
        );
      const result = await api<Aggregate>(
        `/churches/${data.church.id}/plans/${plan.id}/content`,
        {
          method: "POST",
          csrf: session.csrfToken,
          etag: plan.etag,
          body: { mode: "manual" },
        },
      );
      setContent(result.data);
      await refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Study draft could not be created.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="unified-study-workflow">
      <p className="workflow-progress" aria-live="polite">
        Step {workflowStep + 1} of 3 ·{" "}
        {["Create Study", "Gain Approval", "Publish Study"][workflowStep]}
      </p>
      {error && <Notice error>{error}</Notice>}
      {currentContent ? (
        <ContentEditorWithPreview
          initial={currentContent}
          plan={initialPlan}
          slot={slot}
          data={data}
          churchId={data.church.id}
          session={session}
          refresh={refresh}
          workflow
          workflowStep={workflowStep}
          onWorkflowStepChange={setWorkflowStep}
          beforeSubmit={beforeSubmit}
          onAggregateChange={setContent}
        />
      ) : (
        <section className="card unified-create-study">
          <p className="eyebrow">Step 1 · Create Study</p>
          <h2>Write for your church.</h2>
          <p>
            Begin with the study members will read. The finished study receives
            one final approval before publication.
          </p>
          <button
            className="primary"
            onClick={() => void createStudy()}
            disabled={busy || !canCreate}
          >
            {busy ? "Creating…" : "Create study draft"}
          </button>
          {!canCreate && (
            <p className="fine">
              A contributor with study editing permission can start writing.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
