"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { api, ApiError, type Session } from "../lib/api";
import { clearRecoveries } from "../lib/drafts";
import type { WorkspaceData } from "../lib/types";
import { Notice, Empty } from "./ui";
import { StudiesWithCalendarMove as Studies } from "./studies-with-calendar-move";
import { StudyEngagement } from "./study-engagement";
import { Dashboard, Sermons, Settings, Delivery, Moderation } from "./workspace-pages";
import { Onboarding } from "./onboarding";
import { LoginScreen } from "./login-screen";
import { ChurchBrand, ChurchLogo } from "./church-brand";

const navigation = [["dashboard", "Dashboard", "◫"], ["calendar", "Calendar", "◷"], ["studies", "Create a Study", "▧"], ["engagement", "Study Engagement", "♡"], ["settings", "Settings", "⚙"]];

export function Workspace({ route }: { route: string }) {
  const [session, setSession] = useState<Session | null>(null); const [churchId, setChurchId] = useState(""); const [data, setData] = useState<WorkspaceData | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [menu, setMenu] = useState(false);
  const requestEpoch = useRef(0); const selectedChurchRef = useRef("");
  const [needsMfa, setNeedsMfa] = useState(false);
  const load = useCallback(async () => {
    const epoch = ++requestEpoch.current;
    setError("");
    try {
      const { data: current } = await api<Session>("/auth/session");
      if (epoch !== requestEpoch.current) return;
      setSession(current);
      setNeedsMfa(false);
      if (route === "onboarding") return;
      const requestedChurch = new URLSearchParams(window.location.search).get("church");
      const selectedChurch = current.churches.find(church => church.id === requestedChurch) ?? current.churches.find(church => church.id === selectedChurchRef.current) ?? current.churches[0];
      if (!selectedChurch) { setData(null); return; }
      if (current.access === 'member' && selectedChurch.contributorAccess) { setNeedsMfa(true); setData(null); return; }
      if (!selectedChurch.capabilities.includes("workspace:read")) { window.location.assign(`/c/${selectedChurch.slug}`); return; }
      selectedChurchRef.current = selectedChurch.id; setChurchId(selectedChurch.id);
      const result = await api<WorkspaceData>(`/churches/${selectedChurch.id}/workspace`);
      if (epoch !== requestEpoch.current || selectedChurchRef.current !== selectedChurch.id) return;
      setData(result.data);
    } catch (failure) {
      if (epoch !== requestEpoch.current) return;
      if (failure instanceof ApiError && failure.status === 401) { setSession(null); setData(null); }
      else if (failure instanceof ApiError && failure.code === 'mfa_required') { setNeedsMfa(true); setData(null); }
      else setError(failure instanceof Error ? failure.message : "Could not reach the workspace.");
    } finally { if (epoch === requestEpoch.current) setLoading(false); }
  }, [route]);
  useEffect(() => {
    void load();
    const revalidate = () => { void load(); };
    const onVisible = () => { if (document.visibilityState === "visible") revalidate(); };
    window.addEventListener("focus", revalidate); document.addEventListener("visibilitychange", onVisible);
    return () => { requestEpoch.current += 1; window.removeEventListener("focus", revalidate); document.removeEventListener("visibilitychange", onVisible); };
  }, [load]);

  useEffect(() => {
    const theme = data?.church.theme; const root = document.documentElement;
    if (!theme) return;
    const values = { "--teal": theme.tokens?.brand ?? theme.primary, "--gold": theme.tokens?.accent ?? theme.accent, "--cream": theme.tokens?.pageSurface ?? theme.surface, ...Object.fromEntries(Object.entries(theme.tokens ?? {}).map(([name, value]) => [`--theme-${name.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)}`, value])) };
    for (const [name, value] of Object.entries(values)) root.style.setProperty(name, value);
    root.dataset.theme = theme.mode;
    return () => { for (const name of Object.keys(values)) root.style.removeProperty(name); delete root.dataset.theme; };
  }, [data?.church.theme]);
  async function logout() { try { await api("/auth/logout", { method: "POST", csrf: session?.csrfToken }); requestEpoch.current += 1; clearRecoveries(); setSession(null); setData(null); } catch (failure) { setError(failure instanceof Error ? failure.message : "Sign out failed."); } }
  if (!session || needsMfa) return <LoginScreen loading={loading} error={error} retry={() => void load()} />;
  if (!session.churches.length || route === "onboarding") return <Onboarding session={session} refresh={load} />;
  const church = session.churches.find(item => item.id === churchId); const visibleNavigation = navigation.filter(([path]) => path !== "settings" || church?.capabilities.includes("settings:manage"));
  return <div className="shell"><aside className={`sidebar ${menu ? "open" : ""}`}><ChurchBrand name={church?.name ?? "Church workspace"} theme={data?.church.theme} /><p className="nav-label">WORKSPACE</p><nav aria-label="Workspace">{visibleNavigation.map(([path, label, symbol]) => <Link key={path} href={`/${path}?church=${churchId}`} onClick={() => setMenu(false)} className={`nav-link ${route === path ? "active" : ""}`} aria-current={route === path ? "page" : undefined}><span aria-hidden="true">{symbol}</span>{label}</Link>)}</nav><div className="sidebar-bottom"><Link className="person person-link" href={`/user?church=${churchId}`}><span className="avatar">{session.user.displayName.split(" ").map(part => part[0]).slice(0, 2).join("")}</span><span><strong>{session.user.displayName}</strong><small>Church team · account</small></span></Link><a className="new-workspace-link" href="/onboarding">New workspace / invitation →</a><button className="signout" onClick={() => void logout()}>Sign out</button></div></aside><div className="workspace"><header className="topbar"><div className="actions"><button className="menu-button" aria-label="Toggle navigation" aria-expanded={menu} onClick={() => setMenu(!menu)}>☰</button><span className="crumb">Workspace <span aria-hidden="true">/</span> <strong>{navigation.find(([path]) => path === route)?.[1]}</strong></span></div><ChurchLogo src={data?.church.theme?.logoUrl} className="topbar-logo" /><label className="workspace-picker"><span className="sr-only">Church workspace</span><select data-testid="church-switcher" value={churchId} onChange={event => { requestEpoch.current += 1; selectedChurchRef.current = event.target.value; setLoading(true); setData(null); setChurchId(event.target.value); const url = new URL(window.location.href); url.searchParams.set("church", event.target.value); url.searchParams.delete("series"); url.searchParams.delete("slot"); window.history.replaceState(null, "", url); void load(); }}>{session.churches.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></header><main id="main" className="main">{error && <Notice error>{error} <button onClick={() => void load()}>Try again</button></Notice>}{!data ? loading || churchId ? <div className="card skeleton" role="status">Loading your church workspace…</div> : <Empty title="No church membership">Ask your church administrator for an invitation.</Empty> : <>{route === "dashboard" && <Dashboard key={churchId} data={data} session={session} refresh={load} />}{route === "sermons" && <Sermons data={data} session={session} refresh={load} />}{["studies", "calendar", "reviews"].includes(route) && <Studies data={data} session={session} refresh={load} route={route} />}{route === "engagement" && <StudyEngagement data={data} session={session} />}{route === "settings" && <Settings data={data} session={session} refresh={load} />}{route === "delivery" && <Delivery data={data} session={session} />}{route === "moderation" && <Moderation data={data} session={session} />}</>}<footer className="workspace-footer"><span>Rooted · {church?.name}</span><span>Thoughtful preparation. Shared purpose.</span></footer></main></div></div>;
}
