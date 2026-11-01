# 3. Homepage demonstration — visible and already playing

**Revised decision:** opening the homepage's **AI CoWriter** tab/page shows the demo in the first viewport and starts muted inline playback automatically. No Play click, scrolling to discover the demo, login or model request is required for the ordinary path.

The previous poster-first/load-on-intent recommendation is superseded. Keep a useful outcome statement beside the recording, not a large marketing hero pushing it down the page. This affects the AI tab; it does not add autoplay to member-study clips or every homepage tab.

## What the research artifact is

The rebuilt package contains an actual encoded local workflow recording, player and captions/transcript treatment, with browser verification in the [mockup evidence](../mockups/README.md). It uses fictional research UI and scripted actions. **It is not a genuine current-production AI recording, a live AI session or proof of instant generation.** The visible labeling must remain explicit.

A production replacement should record the real implemented workflow: import useful context → select sources → draft → make a human correction → add/rearrange a visual in the same workspace → inspect the saved result → request independent review. Until the merged editor exists, record today's actual product accurately or label a future-workflow preview prominently. Do not advertise prototype tools as already available.

## Autostart behavior

| Condition | Required behavior |
|---|---|
| Ordinary visit/open AI tab | Immediately visible video; autoplay muted, playsinline; actual playing state reflected by Pause |
| Visitor wants sound | Explicit user gesture enables sound if an audio track exists; never autoplay speech |
| Visitor pauses | Stay paused; do not restart on incidental focus/scroll |
| Reduced-motion preference | Static outcome/poster and transcript; optional user-start playback |
| Browser/power/data preference blocks play | Catch rejected play promise; retain first useful frame, honest status and manual fallback |
| Tab hidden/navigation away/offscreen | Pause; avoid background playback and continuing downloads where practical |
| Media unavailable/unsupported | Useful summary/step transcript and retry/play fallback; no blank black rectangle |

Chrome's [autoplay policy](https://developer.chrome.com/blog/autoplay) and WebKit's [inline/muted policy](https://webkit.org/blog/6784/new-video-policies-for-ios/) support muted inline autostart but also require respecting actual playback outcomes. Browser/OS/enterprise restrictions mean “always plays under every setting” is not a defensible promise. The normal path still fulfills automatic start without a Play click.

Visible **Pause**, accessible native/custom controls, captions/step descriptions and transcript support comprehension. Moving material running alongside other content requires a pause/stop mechanism under [W3C 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide). Honor reduced motion rather than forcing motion to satisfy a marketing requirement. The silent research recording does not pretend to contain narration; production spoken audio needs synchronized captions and relevant visual descriptions following [WAI media guidance](https://www.w3.org/WAI/media/av/).

## Recording and release path

Use an isolated fictional church, rights-cleared sample source and safe account details. Retain the script, sample input/output and recording provenance. Label edited waiting time; never convert cuts into speed claims. First create a concise 20–30 second outcome loop/sequence, then optionally a fuller 60–90 second walkthrough with chapters after a comprehension trial. These are proposed production durations, not measured generation times.

Host a compressed responsive recording and fast poster; preload enough to start when the AI tab becomes active, not only on Play. Lazy-load unrelated imagery and avoid downloading the demo on unrelated tabs. Encode a broadly supported MP4 plus optional WebM where appropriate and test actual device codecs. Reserve dimensions to prevent layout shift, measure startup/transfer/LCP and pause on visibility changes. A local WebM playback test does not establish iOS MP4 delivery or CDN performance.

Release gates: verify first viewport at desktop/phone, no-gesture start in fresh sessions, pause/unmute/caption/focus, reduced motion, blocked play, media error, hidden tab, data/power restrictions and real iOS/Android codecs. Show real church contributors the final recording and ask what context is supplied, what is saved, who approves and whether the example is live. No paid model call or genuine production video was created by this research.
