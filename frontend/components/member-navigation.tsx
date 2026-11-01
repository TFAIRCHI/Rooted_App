"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Session } from "../lib/api";
import { clearRecoveries } from "../lib/drafts";
import { contributorSignIn } from "../lib/sign-in";

export function MemberNavigation({ slug, churchName, logoUrl }: { slug: string; churchName: string; logoUrl: string | null }) {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api<Session>("/auth/session").then(result => setSession(result.data)).catch(() => setSession(null)); }, []);
  async function logout() { if (!session) return; try { await api("/auth/logout", { method: "POST", csrf: session.csrfToken }); clearRecoveries(); window.location.assign(`/c/${slug}`); } catch { setError("Could not sign out. Please try again."); } }
  const church = session?.churches.find(item => item.slug === slug);
  const contributor = church?.contributorAccess || church?.capabilities.includes('workspace:read');
  const workspacePath = `/dashboard?church=${church?.id ?? ''}`;
  return <header className="member-navigation"><Link href={`/c/${slug}`} className="brand">Rooted</Link><span className="member-navigation-name">{churchName}</span>{logoUrl ? <img className="member-navigation-logo" src={logoUrl} alt={`${churchName} logo`} /> : null}<div className="actions"><Link className="inline-link" href={`/c/${slug}`}>Church studies</Link>{contributor ? <a className="inline-link" href={session?.access === 'member' ? contributorSignIn(workspacePath) : workspacePath}>Contributor workspace</a> : null}{session ? <button className="text-button" onClick={() => void logout()}>Sign out</button> : null}{error ? <span role="alert">{error}</span> : null}</div></header>;
}
