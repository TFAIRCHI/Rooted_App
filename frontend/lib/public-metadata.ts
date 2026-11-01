import type { Metadata } from "next";
export function publicOrigin(): string | undefined {
  const value = process.env.ROOTED_PUBLIC_ORIGIN;
  if (!value || process.env.NODE_ENV !== "production") return undefined;
  try { const url = new URL(value); if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash || !url.hostname.includes(".") || /^[\d.]+$/.test(url.hostname) || url.hostname.startsWith("[") || /(^|\.)(localhost|local|internal|test|invalid)$/.test(url.hostname)) return undefined; return url.origin; } catch { return undefined; }
}
export function publicMetadata(title: string, description: string, path: string): Metadata {
  const origin = publicOrigin();
  return { title: `${title} · Rooted`, description, robots: { index: Boolean(origin), follow: Boolean(origin) }, ...(origin ? { metadataBase: new URL(origin), alternates: { canonical: path }, openGraph: { title, description, url: path, images: [{ url: "/rooted-share.svg", width: 1200, height: 630, alt: "Rooted — Let Sunday take root. All week long." }] } } : {}) };
}
