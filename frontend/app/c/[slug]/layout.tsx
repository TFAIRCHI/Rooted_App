import type { CSSProperties, ReactNode } from "react";
import { memberFetch } from "../../../lib/member-server";
import { MemberNavigation } from "../../../components/member-navigation";
import type { Session } from "../../../lib/api";

export default async function MemberSlugLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let style: CSSProperties | undefined;
  let churchName = "Church";
  let logoUrl: string | null = null;
  try {
    const sessionResponse = await memberFetch("/auth/session");
    const session: Session | null = sessionResponse.ok ? await sessionResponse.json() : null;
    const church = session?.churches.find(item => item.slug === slug);
    churchName = church?.name ?? churchName;
    const response = await memberFetch(church ? `/churches/${church.id}/theme` : `/public/churches/${encodeURIComponent(slug)}/theme`);
    if (response.ok) {
      const theme = await response.json() as { tokens?: Record<string, string>; churchName?: string; logoUrl?: string | null; assetId?: string | null };
      churchName = theme.churchName ?? churchName;
      logoUrl = church && theme.assetId ? `/api/v1/churches/${church.id}/theme/logo/${theme.assetId}/lockup` : theme.logoUrl ?? null;
      if (theme.tokens) style = Object.fromEntries(Object.entries(theme.tokens).map(([name, value]) => [`--theme-${name.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)}`, value])) as CSSProperties;
    }
  } catch { style = undefined; }
  return <div className="member-theme-root" style={style}><MemberNavigation slug={slug} churchName={churchName} logoUrl={logoUrl} />{logoUrl ? <div className="member-brand-banner"><img src={logoUrl} alt={`${churchName} logo`} /><span>{churchName}</span></div> : null}{children}</div>;
}
