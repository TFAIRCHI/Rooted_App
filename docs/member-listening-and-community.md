# Member study listening and conversation

Implemented October 25, 2026 in the existing published-study reader.

## Listening

The top of a received study now has **Listen to study**, **Pause**, **Resume**, and **Stop** controls. Playback begins only after a click. It reads the displayed study material, including references, reflection, questions, application and prayer; it does not read comments, private drafts, or contributor notes. Short sequential utterances keep long studies bounded. Changing studies, leaving the page, stopping or encountering a speech error invalidates pending callbacks.

This uses the browser's [SpeechSynthesis API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis). A local English voice is preferred when available; otherwise the browser uses its default voice. Voice availability, pronunciation and mobile/background playback depend on the browser/device. Unsupported browsers display an explanation while retaining the full readable study. No Azure speech deployment, paid model request or stored audio file is introduced.

## Comments and reactions

The redesigned reader had stopped rendering the existing `MemberActions` component. It is now restored beneath the study. Members can select **👍 Like, 🔥 Inspired, 🙏 Praying, ❤️ Thankful, or 🙌 Encouraged**. One reaction per member/study is retained; choosing another replaces it, and selecting the same reaction removes it. Existing reactions remain intact. Migration `026_positive_reactions.sql` adds Like and Inspired to the database constraint and API validation; engagement totals include them.

Signed-in church membership is required to participate. Public readers can sign in; signed-in outsiders are directed to the invitation path. Design-preview examples do not submit community actions. Component state is separated by church, study and identity.

Comments retain server-side moderation: explicit personal attacks and threats are automatically declined. Other comments remain private until church review, including unclear negativity, potential conflicts of interest, quotations and honest questions. Automatic rules do not claim to understand every negative statement or infer undisclosed interests. Declined text is visible only to its author and authorized church reviewers; authors can revise it. Existing approval, replies, reports, restrictions and tenant boundaries remain in force.

If comments are disabled, a church administrator or authorized contributor can use **Settings → Enable member discussion · moderated before posting → Save church settings**. This update preserves each church's existing choice; it does not enable discussions across every church. Positive reactions remain available when discussion is disabled.

## Verification

- Unit tests: **49 frontend, 36 backend, 4 operations passed**. Audio tests cover no autoplay, sequential chunks, pause/resume/stop, stale callback rejection, study changes/unmount, unsupported devices and speech errors.
- All **53 backend integration tests passed**, including moderation, privacy, publication and tenant boundaries.
- The two focused member browser journeys passed: member-reader accessibility/publication checks and the complete published study → audio controls → positive reactions → reviewed question/reply → automatic attack rejection → withdrawal/deletion lifecycle. Playback in browser automation uses a deterministic voice stub; no claim of an audible OS-device test is made.
- The member lifecycle journey passed again after correcting small-screen form layout, with an explicit no-horizontal-overflow check at 390px.
- Lint, payload contracts, TypeScript and production builds passed. The previously documented member-reader contrast issue was corrected in the affected navigation/label styles; its existing accessibility assertion now passes. The member test now clicks the actual **Begin this study** link rather than a noninteractive featured heading.

The broader browser suite was not rerun for this change; the focused checks above are the verification scope.

Screenshots: [published study with listening controls](evidence/member-listening-and-community/member-study-mobile.png), [conversation, reactions, approved reply and private declined comment](evidence/member-listening-and-community/member-conversation-mobile.png). All screenshots use isolated fictional test data. [Browser results](evidence/member-listening-and-community/browser-results.json) record the focused acceptance run.

The additive migration was applied locally and the existing development stack was restarted using `npm run dev:existing`, preserving saved studies, conversations and settings. Review the running application at **http://127.0.0.1:3000/**.
