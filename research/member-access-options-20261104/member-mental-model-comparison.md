# Receiving the study text: member mental models

Research snapshot: **2026-11-04**. This compares the proposed experiences from the perspective of a person holding a phone. It is a product model, not a usability-test result. [Option A](option-a-phone-verified.md) uses a verified phone binding and an expiring entry link to establish member access. [Option B](option-b-public-links.md) uses a stable public study URL and no reader sign-in.

| Moment | Option A: verified-phone member | Option B: public link |
| --- | --- | --- |
| Before the first text | “I may need to verify my number once so Rooted knows this member account is mine.” Admin-entered or imported numbers are candidates, not trusted identities. | “I only need to opt in to church texts.” No Rooted reader account or phone verification is needed for reading. |
| Text arrives | “This message is for me; its link can open my member view.” The SMS carries a short-lived, single-use entry credential. | “This is an invitation to read a public study.” The SMS contains the creator's note and a stable link; the link has no identity power. |
| First tap | Ideally, the link exchanges and opens the exact study. An expired, used or scanner-consumed link may require a recovery step or fresh verification. | The exact study opens immediately, with a path to the church's other available studies. There is no login recovery or token expiry. |
| Later or on another device | A member session may persist on the first device; a new device needs another valid entry path. A forwarded single-use link should not become someone else's member access. | The same link opens on any device at any time while the study remains published. Forwarding is expected. |
| Reaction | Reaction is tied to the member account and can be changed or counted as one member's response. | One tap without name. Browser-based deduplication is approximate; the count means reactions, not unique people. |
| Comment | The app can attribute the comment to the verified member account. | The reader types a name and comment. The name is unverified, and the comment waits for moderation. |
| Privacy expectation | “The study and my engagement are for authorized church members.” This depends on correct phone binding and session security. | “The study and any approved comment can be seen by anyone with the link, and perhaps through the public library.” |
| If SMS fails or is declined | An alternative authenticated route or fresh verification is needed to get into the member area. | The reader can still use any shared study link or visit the public church study page. SMS consent is only for delivery. |

## The simplest possible instructions to a reader

**Option A:** “Tap the study link in your church text. If it no longer works, ask for a new link or verify your number.” The one-time setup and fallback are the main cognitive burden.

**Option B:** “Tap the study link and read. Tap a reaction if you like. Enter your name if you want to comment.” The public nature of the page and unverified names should be visible in the interface.

## Product decision in one sentence

Choose **Option B** if the church is comfortable making approved studies and moderated discussion public and prioritizes the fewest reader steps. Choose **Option A** if restricted access, verified attribution or member-level history is essential. Both options still require separate SMS opt-in, sender compliance, scheduling review and STOP handling. Neither option should silently treat a saved phone number as permission to text.
