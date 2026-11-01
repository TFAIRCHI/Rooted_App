export const marketingPages = [
  { href: "/", label: "Home", title: "Let Sunday take root. All week long.", description: "Turn your church’s teaching into weekday Bible studies with an AI co-writer and human review. Grow in Scripture, stay connected, and bring faith home." },
  { href: "/why-rooted", label: "Why Rooted", title: "More room for the message to grow", description: "Connect Sunday teaching to everyday life with Scripture, reflection, and a shared study rhythm for your church." },
  { href: "/how-it-works", label: "How it works", title: "One church. Two thoughtful experiences.", description: "Explore Rooted’s member reading experience and church workspace, from sermon notes to reviewed, published Bible studies." },
  { href: "/ai-co-writer", label: "AI Co-writer", title: "A little input. A helpful head start.", description: "Plan and draft Bible studies from your church’s teaching. Confirm each day, edit saved drafts, and review before publishing." },
  { href: "/power-of-four", label: "The Power of 4", title: "Four days in the Word", description: "Explore a regular Scripture rhythm and the Center for Bible Engagement research behind the invitation to return throughout the week." },
  { href: "/questions", label: "Questions", title: "Made for your church’s real week", description: "Answers about preparing Bible studies, AI assistance, human review, study schedules, pricing, and joining your church." },
] as const;

// Explicit public discovery list. Account, workspace, and church/member routes stay private.
export const publicDiscoveryPaths = [...marketingPages.map(page => page.href), "/get-started", "/sample-study"];

export const legacyMarketingFragments: Readonly<Record<string, string>> = {
  "#why-rooted": "/why-rooted",
  "#the-rooted-difference": "/why-rooted#rooted-difference",
  "#your-week": "/why-rooted#example-week",
  "#after-panel": "/why-rooted#after-sunday",
  "#before-panel": "/why-rooted#before-sunday",
  "#how-it-works": "/how-it-works",
  "#inside-rooted": "/how-it-works#product-tour",
  "#ai-co-writer": "/ai-co-writer",
  "#ai-simple-panel": "/ai-co-writer#simple-request",
  "#ai-detailed-panel": "/ai-co-writer#sermon-notes",
  "#power-of-four": "/power-of-four",
  "#cbe-research-note": "/power-of-four#research-source",
  "#questions": "/questions",
  "#trust": "/questions#trust",
};
