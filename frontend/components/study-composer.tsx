"use client";

import { useEffect, useRef, useState } from "react";
import type { ContentDraft } from "../lib/content";
import { CreatorIcon } from "./creator-icons";

type LocalMedia = { id: string; name: string; url: string; type: string };

export function StudyComposer({
  draft,
  edit,
  disabled,
}: {
  draft: ContentDraft;
  edit: (field: string, value: string) => void;
  disabled: boolean;
}) {
  const body = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const urls = useRef(new Set<string>());
  const [menu, setMenu] = useState(false);
  const [linkKind, setLinkKind] = useState<"image" | "video" | "link" | null>(
    null,
  );
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [localMedia, setLocalMedia] = useState<LocalMedia[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const retained = urls.current;
    return () => {
      retained.forEach((value) => URL.revokeObjectURL(value));
    };
  }, []);
  useEffect(() => {
    if (!menu) return;
    function outside(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenu(false);
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [menu]);
  function insert(before: string, after = "", fallback = "") {
    const textarea = body.current;
    const start = textarea?.selectionStart ?? draft.body.length;
    const end = textarea?.selectionEnd ?? start;
    const selected = draft.body.slice(start, end) || fallback;
    edit(
      "body",
      draft.body.slice(0, start) +
        before +
        selected +
        after +
        draft.body.slice(end),
    );
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    });
  }
  function addLink() {
    try {
      const parsed = new URL(url);
      if (
        parsed.protocol !== "https:" ||
        /[\s<>()]/.test(url) ||
        parsed.username ||
        parsed.password
      )
        throw new Error();
      const label = (
        caption.trim() ||
        (linkKind === "image"
          ? "Study image"
          : linkKind === "video"
            ? "Watch this video"
            : "Related resource")
      ).replace(/[[\]\r\n]/g, "");
      const snippet = `\n\n${linkKind === "image" ? "!" : ""}[${label}](${parsed.href})\n\n`;
      if (draft.body.length + snippet.length > 100000) {
        setError("The study body is too long to add another link.");
        return;
      }
      insert(snippet);
      setLinkKind(null);
      setUrl("");
      setCaption("");
      setError("");
    } catch {
      setError("Enter a valid HTTPS URL without spaces or parentheses.");
    }
  }
  async function selectFile(file?: File) {
    if (!file) return;
    if (
      ![
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "video/mp4",
        "video/webm",
      ].includes(file.type) ||
      file.size > 25_000_000
    ) {
      setError("Choose a JPG, PNG, GIF, WebP, MP4, or WebM file up to 25 MB.");
      return;
    }
    if (localMedia.length >= 5) {
      setError("Preview up to five local files at a time.");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    urls.current.add(objectUrl);
    setLocalMedia((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        url: objectUrl,
      },
    ]);
    setError("");
    setMenu(false);
  }
  return (
    <fieldset className="study-composer" disabled={disabled}>
      <div className="creator-field">
        <label htmlFor="content-title">Day title</label>
        <input
          id="content-title"
          data-testid="content-title"
          value={draft.title}
          maxLength={500}
          onChange={(event) => edit("title", event.target.value)}
          placeholder="Give today’s study a title"
        />
      </div>
      <div className="creator-field">
        <div className="creator-label-row">
          <label htmlFor="content-referencesText">
            Primary scripture & source links
          </label>
          <span>Optional · one per line</span>
        </div>
        <div className="creator-scripture">
          <CreatorIcon name="book" />
          <textarea
            id="content-referencesText"
            data-testid="content-references"
            rows={2}
            value={draft.referencesText ?? ""}
            onChange={(event) => edit("referencesText", event.target.value)}
            placeholder="Add a passage, e.g. John 15:1–8"
          />
        </div>
      </div>
      <div className="creator-field">
        <label htmlFor="content-body">Study content</label>
        <div className="creator-rich-editor">
          <div
            className="creator-toolbar"
            role="toolbar"
            aria-label="Study content formatting"
          >
            <select
              aria-label="Text style"
              value=""
              onChange={(event) => {
                if (event.target.value)
                  insert(event.target.value, "", "Heading");
              }}
            >
              <option value="">Paragraph</option>
              <option value={"\n## "}>Heading</option>
            </select>
            <span className="creator-toolbar-separator" />
            <button
              type="button"
              aria-label="Bold"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insert("**", "**", "bold text")}
            >
              <strong>B</strong>
            </button>
            <button
              type="button"
              aria-label="Italic"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insert("*", "*", "italic text")}
            >
              <em>I</em>
            </button>
            <button
              type="button"
              aria-label="Add link"
              onClick={() => {
                setLinkKind("link");
                setError("");
              }}
            >
              <CreatorIcon name="link" size={16} />
            </button>
            <span className="creator-toolbar-separator" />
            <button
              type="button"
              aria-label="Block quote"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insert("\n> ", "", "Quote")}
            >
              “
            </button>
          </div>
          <textarea
            ref={body}
            id="content-body"
            data-testid="content-body"
            value={draft.body}
            maxLength={100000}
            onChange={(event) => edit("body", event.target.value)}
            placeholder="Shape the scripture, reflection, and next step for this day…"
          />
          {localMedia.map((item) => (
            <figure className="creator-local-media" key={item.id}>
              {item.type.startsWith("image/") ? (
                <img src={item.url} alt={item.name} />
              ) : (
                <video src={item.url} controls preload="metadata" />
              )}
              <figcaption>
                <strong>{item.name}</strong>
                <span>
                  Local preview only · add a hosted link to save this media with
                  the study.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(item.url);
                    urls.current.delete(item.url);
                    setLocalMedia((current) =>
                      current.filter((media) => media.id !== item.id),
                    );
                  }}
                >
                  Remove
                </button>
              </figcaption>
            </figure>
          ))}
          <div className="creator-editor-footer">
            <div ref={menuRef} className="creator-media-wrap">
              <button
                type="button"
                className="creator-add-media"
                aria-expanded={menu}
                onClick={() => setMenu(!menu)}
              >
                <CreatorIcon name="plus" />
                Add media
              </button>
              {menu && (
                <div className="creator-media-menu">
                  {(
                    [
                      ["image", "Image", "Add a hosted image"],
                      ["video", "Video", "YouTube, Vimeo, or video URL"],
                      ["link", "Embed link", "A related website or document"],
                    ] as const
                  ).map(([kind, label, hint]) => (
                    <button
                      type="button"
                      key={kind}
                      onClick={() => {
                        setLinkKind(kind);
                        setMenu(false);
                        setError("");
                      }}
                    >
                      <span>
                        <CreatorIcon name={kind} />
                      </span>
                      <div>
                        <strong>{label}</strong>
                        <small>{hint}</small>
                      </div>
                    </button>
                  ))}
                  <button type="button" onClick={() => picker.current?.click()}>
                    <span>
                      <CreatorIcon name="upload" />
                    </span>
                    <div>
                      <strong>Preview a local file</strong>
                      <small>Images or clips · not uploaded yet</small>
                    </div>
                  </button>
                </div>
              )}
              <input
                ref={picker}
                className="sr-only"
                aria-label="Preview a local image or video"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                onChange={(event) => {
                  void selectFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>
            <span>{draft.body.length.toLocaleString()} characters</span>
          </div>
        </div>
      </div>
      {linkKind && (
        <section className="creator-link-form" aria-label="Add media link">
          <div className="creator-label-row">
            <strong>
              Add {linkKind === "link" ? "resource" : linkKind} link
            </strong>
            <button
              type="button"
              onClick={() => {
                setLinkKind(null);
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
          <label htmlFor="creator-media-url">HTTPS URL</label>
          <input
            autoFocus
            id="creator-media-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://"
          />
          <label htmlFor="creator-media-caption">
            {linkKind === "image" ? "Image description" : "Link label"}
          </label>
          <input
            id="creator-media-caption"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={200}
          />
          <button
            type="button"
            className="primary"
            disabled={!url.trim()}
            onClick={addLink}
          >
            Insert into study
          </button>
          <p className="fine">
            Saved as a Markdown link in your study content.
          </p>
        </section>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="creator-prompt-grid">
        <div className="creator-field">
          <label htmlFor="content-reflection">Reflection prompt</label>
          <textarea
            id="content-reflection"
            data-testid="content-reflection"
            value={draft.reflection}
            maxLength={20000}
            onChange={(event) => edit("reflection", event.target.value)}
            placeholder="Help members slow down and notice…"
          />
        </div>
        <div className="creator-field">
          <label htmlFor="content-discussionQuestion">
            Discussion question
          </label>
          <textarea
            id="content-discussionQuestion"
            data-testid="content-question"
            value={draft.discussionQuestion}
            maxLength={10000}
            onChange={(event) => edit("discussionQuestion", event.target.value)}
            placeholder="Add a question members can answer together…"
          />
        </div>
      </div>
      <div className="creator-field">
        <label htmlFor="content-application">Application</label>
        <textarea
          id="content-application"
          data-testid="content-application"
          value={draft.application}
          maxLength={20000}
          onChange={(event) => edit("application", event.target.value)}
          placeholder="One practical next step for the day…"
        />
      </div>
      <details className="creator-message-details">
        <summary>Message preview</summary>
        <label className="sr-only" htmlFor="content-outboundPreview">
          Message preview
        </label>
        <textarea
          id="content-outboundPreview"
          data-testid="content-preview"
          value={draft.outboundPreview}
          maxLength={2000}
          onChange={(event) => edit("outboundPreview", event.target.value)}
        />
      </details>
    </fieldset>
  );
}
