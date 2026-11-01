import type { Metadata } from "next";
import { SkipLink } from "../components/skip-link";
import "./globals.css";
import "./unified-workflow.css";
import "./brand-fix.css";
import "./community.css";
import "./member-landing.css";
import "./member-study.css";
import "./study-creator.css";
import "./public-site.css";
import "./homepage-showcase.css";
import "./marketing-site.css";

export const metadata: Metadata = { title: "Rooted · Church workspace", description: "Growing Deeper Together.", robots: { index: false, follow: false } };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body><SkipLink />{children}</body></html>;
}
