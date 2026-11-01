"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type ChurchTheme, type Session } from "../../lib/api";
import { clearRecoveries } from "../../lib/drafts";

export default function UserPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { api<Session>("/auth/session").then(result => setSession(result.data)).catch(failure => setError(failure instanceof Error ? failure.message : "Your session could not be loaded.")).finally(() => setLoading(false)); }, []);
  useEffect(() => { const church = session?.churches[0]; if (!church) return; api<ChurchTheme>(`/churches/${church.id}/theme`).then(result => setLogoUrl(result.data.logoUrl ?? null)).catch(() => setLogoUrl(null)); }, [session]);
  useEffect(() => { const header = document.querySelector<HTMLElement>('.standalone-header'); if (!header) return; const existing = header.querySelector('.standalone-logo'); if (logoUrl && !existing) { const logo = document.createElement('img'); logo.className = 'standalone-logo'; logo.src = logoUrl; logo.alt = `${session?.churches[0]?.name ?? 'Church'} logo`; header.append(logo); } else if (!logoUrl && existing) existing.remove(); }, [logoUrl, session]);
  async function logout() { if (!session) return; try { await api("/auth/logout", { method: "POST", csrf: session.csrfToken }); clearRecoveries(); window.location.assign("/"); } catch (failure) { setError(failure instanceof Error ? failure.message : "Sign out failed."); } }
  if (loading) return <main className="loading-screen" role="status"><span className="brand">Rooted</span><p>Loading your account…</p></main>;
  if (!session) return <main className="loading-screen"><span className="brand">Rooted</span><p>{error || "You are not signed in."}</p><Link className="button" href="/">Return home</Link></main>;
  return <div className="standalone-page"><header className="standalone-header"><Link href={`/dashboard?church=${session.churches[0]?.id ?? ""}`} className="brand">Rooted</Link><span className="standalone-context">Account</span><Link className="button" href={`/dashboard?church=${session.churches[0]?.id ?? ""}`}>← Return to workspace</Link></header><main id="main" className="member-main"><section className="card"><p className="eyebrow">Rooted · Account</p><h1>{session.user.displayName}</h1><p className="muted">You are signed in to your church workspace.</p>{error && <p className="notice error">{error}</p>}<button className="primary" onClick={() => void logout()}>Sign out</button></section></main></div>;
}
