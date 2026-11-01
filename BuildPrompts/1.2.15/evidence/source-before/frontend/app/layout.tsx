import type { Metadata } from "next";
import "./globals.css";
import "./unified-workflow.css";
import "./brand-fix.css";
import "./community.css";
import "./member-landing.css";
import "./member-study.css";
import "./study-creator.css";
import "./public-site.css";
import "./homepage-showcase.css";

export const metadata: Metadata = { title: "Rooted · Church workspace", description: "Growing Deeper Together.", robots: { index: false, follow: false } };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a>{children}</body></html>;
}
