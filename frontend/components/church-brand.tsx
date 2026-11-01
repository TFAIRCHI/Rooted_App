"use client";

import { useState } from "react";
import type { ChurchTheme } from "../lib/api";

export type BrandTheme = ChurchTheme & { markUrl?: string | null; logoMarkUrl?: string | null; logoWidth?: number; logoHeight?: number; logoAspectRatio?: number; logo?: { width?: number; height?: number; markUrl?: string | null } };

export function sidebarLogo(theme?: BrandTheme) {
  if (!theme?.logoUrl) return null;
  const width = theme.logoWidth ?? theme.logo?.width; const height = theme.logoHeight ?? theme.logo?.height;
  const ratio = theme.logoAspectRatio ?? (width && height ? width / height : undefined);
  if (ratio && ratio <= 1.3) return theme.logoMarkUrl ?? theme.markUrl ?? theme.logo?.markUrl ?? theme.logoUrl.replace(/\/lockup$/, "/mark");
  return theme.logoUrl;
}

export function ChurchLogo({ src, className }: { src?: string | null; className: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  return src && failed !== src ? <img className={className} src={src} alt="" onError={() => setFailed(src)} /> : null;
}

export function ChurchBrand({ name, theme }: { name: string; theme?: BrandTheme }) {
  return <a href="/" className="church-brand brand" aria-label={`${name} · Rooted home`}><span className="church-logo-stage"><ChurchLogo src={sidebarLogo(theme)} className="brand-logo" /></span><strong className="church-name">{name}</strong><span className="rooted-label">Rooted</span></a>;
}
