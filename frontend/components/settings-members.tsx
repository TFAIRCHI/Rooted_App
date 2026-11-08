"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Session } from "../lib/api";
import type { Member, WorkspaceData } from "../lib/types";
import { Notice } from "./ui";

type Invitation = { id: string; targetSubject: string; role: string; expiresAt: string; acceptedAt?: string | null; revokedAt?: string | null; createdAt: string };
type Tab = "all" | "members" | "invitations";
type Drawer = "add" | "edit" | null;
const roles = ["member", "contributor", "approver", "publisher", "moderator", "admin"];

function roleOf(member: Member) {
  const grants = member.capabilities;
  if (grants.includes("admin:manage")) return "admin";
  if (grants.includes("plans:edit") || grants.includes("content:edit")) return "contributor";
  if (grants.includes("content:approve")) return "approver";
  if (grants.includes("publication:schedule")) return "publisher";
  if (grants.includes("moderation:manage")) return "moderator";
  return "member";
}
function invitationStatus(item: Invitation) {
  if (item.acceptedAt) return "Accepted";
  if (item.revokedAt) return "Revoked";
  return new Date(item.expiresAt).getTime() <= Date.now() ? "Expired" : "Invited";
}

export function SettingsMembers({ data, session, refresh }: { data: WorkspaceData; session: Session; refresh: () => Promise<void> }) {
  const churchId = data.church.id;
  const capabilities = session.churches.find(church => church.id === churchId)?.capabilities ?? [];
  const canManage = capabilities.includes("memberships:manage");
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [target, setTarget] = useState<Member | null>(null);
  const [subject, setSubject] = useState("");
  const [role, setRole] = useState("contributor");
  const [reason, setReason] = useState("");
  const [token, setToken] = useState("");
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const prefix = `/churches/${churchId}`;
  const load = useCallback(async () => {
    if (!canManage) return;
    try {
      const [people, invites] = await Promise.all([
        api<{ items: Member[] }>(`${prefix}/members/access`),
        api<{ items: Invitation[] }>(`${prefix}/invitations`),
      ]);
      setMembers(people.data.items);
      setInvitations(invites.data.items);
      setError("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Access details could not be loaded."); }
    finally { setLoading(false); }
  }, [canManage, prefix]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!drawer) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setDrawer(null); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'));
      const first = focusable[0], last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); opener.current?.focus(); };
  }, [drawer]);

  if (!canManage) return <section className="card"><h1>Members & access</h1><p>Only church access administrators can manage invitations and roles.</p></section>;
  const offeredRoles = capabilities.includes("admin:manage") ? roles : roles.filter(item => item !== "admin");
  const activeInvitations = invitations.filter(item => invitationStatus(item) === "Invited");
  const rows = [
    ...members.map(member => ({ key: member.userId, name: member.displayName, identity: member.userId, role: roleOf(member), status: member.active === false ? "Inactive" : "Active", member, invitation: null as Invitation | null })),
    ...activeInvitations.map(invitation => ({ key: invitation.id, name: invitation.targetSubject, identity: invitation.targetSubject, role: invitation.role, status: "Invited", member: null as Member | null, invitation })),
  ].filter(row => (tab !== "members" || !!row.member) && (tab !== "invitations" || !!row.invitation))
    .filter(row => !search || `${row.name} ${row.identity}`.toLowerCase().includes(search.toLowerCase()))
    .filter(row => !roleFilter || row.role === roleFilter)
    .filter(row => !statusFilter || row.status === statusFilter);
  function open(next: Drawer, member: Member | null = null) {
    opener.current = document.activeElement as HTMLElement;
    setTarget(member); setSubject(""); setRole(member ? roleOf(member) : "contributor"); setReason(""); setToken(""); setError(""); setDrawer(next);
  }
  async function submitInvite(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await api<{ token: string }>(`${prefix}/invitations`, { method: "POST", csrf: session.csrfToken, body: { targetSubject: subject.trim(), role, reason: reason.trim() } });
      setToken(result.data.token); setMessage("Invitation created. Share its token securely with the named identity; no message was sent."); await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Invitation could not be created."); }
    finally { setBusy(false); }
  }
  async function change(path: string, body: Record<string, unknown>) {
    setBusy(true); setError("");
    try {
      await api(`${prefix}${path}`, { method: "POST", csrf: session.csrfToken, body });
      setMessage("Access change recorded."); setDrawer(null); await Promise.all([load(), refresh()]);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Access could not be changed."); }
    finally { setBusy(false); }
  }
  async function revoke(item: Invitation) {
    setBusy(true); setError("");
    try { await api(`${prefix}/invitations/${item.id}/revoke`, { method: "POST", csrf: session.csrfToken, body: {} }); setMessage("Invitation revoked."); await load(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Invitation could not be revoked."); }
    finally { setBusy(false); }
  }
  return <div className="settings-page">
    <header className="settings-heading"><div><p className="eyebrow">Workspace settings</p><h1>The people shaping the work.</h1><p className="muted">Manage church access, invitations, and the people who help your church grow.</p></div><button className="primary" onClick={() => open("add")}>＋ Add member</button></header>
    {error && !drawer && <Notice error>{error}</Notice>}{message && <Notice>{message}</Notice>}
    <section className="settings-panel settings-roster">
      <div className="settings-tabs" aria-label="People view">
        {([ ["all", "All people", members.length + activeInvitations.length], ["members", "Members", members.length], ["invitations", "Invitations", activeInvitations.length] ] as const).map(([value, label, count]) => <button key={value} type="button" aria-current={tab === value ? "true" : undefined} onClick={() => setTab(value)}>{label} <small>{count}</small></button>)}
        <button className="settings-history-link" onClick={() => { setTab("invitations"); setStatusFilter(""); }}>Invitation history ↗</button>
      </div>
      <div className="settings-filters"><label className="sr-only" htmlFor="settings-person-search">Search name or identity</label><input id="settings-person-search" placeholder="Search name or identity…" value={search} onChange={event => setSearch(event.target.value)} /><label className="sr-only" htmlFor="settings-role-filter">Role</label><select id="settings-role-filter" value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option value="">All roles</option>{roles.map(item => <option key={item} value={item}>{item}</option>)}</select><label className="sr-only" htmlFor="settings-status-filter">Status</label><select id="settings-status-filter" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">All statuses</option>{["Active", "Inactive", "Invited"].map(item => <option key={item}>{item}</option>)}</select></div>
      {loading ? <p className="settings-empty" role="status">Loading church access…</p> : rows.length ? <div className="settings-table-wrap"><table className="settings-table"><thead><tr><th>Person</th><th>Role</th><th>Status</th><th>Access activity</th><th>Actions</th></tr></thead><tbody>{rows.map(row => <tr key={row.key}><td><div className="settings-person"><span className="settings-avatar" aria-hidden="true">{row.name.split(" ").map(part => part[0]).slice(0,2).join("").toUpperCase()}</span><span><strong>{row.name}</strong>{row.member?.userId === session.user.id && <small> · You</small>}<small>{row.identity}</small></span></div></td><td><span className="settings-tag">{row.role}</span></td><td><span className={`settings-status ${row.status.toLowerCase()}`}>{row.status}</span></td><td>{row.invitation ? `Expires ${new Date(row.invitation.expiresAt).toLocaleDateString()}` : row.member?.userId === session.user.id ? "Current session" : row.status === "Inactive" ? "Access paused" : "Access enabled"}</td><td>{row.member ? row.member.userId === session.user.id ? <span className="fine">Own grants locked</span> : <button className="text-button" onClick={() => open("edit", row.member)}>Edit access</button> : row.invitation ? <button className="text-button" disabled={busy} onClick={() => void revoke(row.invitation!)}>Revoke invite</button> : null}</td></tr>)}</tbody></table></div> : <p className="settings-empty">No people match these filters.</p>}
      <p className="settings-panel-foot">{members.length} church identities · {activeInvitations.length} pending invitations</p>
    </section>
    {tab === "invitations" && <section className="settings-panel settings-section"><h2>Invitation history</h2>{invitations.length ? invitations.map(item => <div className="settings-row" key={item.id}><span><strong>{item.targetSubject}</strong><small>{item.role} · created {new Date(item.createdAt).toLocaleDateString()}</small></span><span className="settings-tag">{invitationStatus(item)}</span>{invitationStatus(item) === "Invited" && <button disabled={busy} onClick={() => void revoke(item)}>Revoke</button>}</div>) : <p className="muted">No invitations yet.</p>}</section>}
    <section className="settings-role-guide"><div className="settings-row"><h2>A place for every kind of contribution.</h2></div><div className="settings-role-grid"><p><strong>Church member</strong><br />Legacy church identity; public study links do not require sign-in.</p><p><strong>Contributor</strong><br />Prepares study material and submits work for review.</p><p><strong>Administrator</strong><br />Manages church access and publishing.</p></div><p className="fine">Access is tied to a verified identity, not an email address alone. Sensitive authority requires a policy owner; no one can change their own grants.</p></section>
    {drawer && <div className="settings-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setDrawer(null); }}><aside ref={dialogRef} className="settings-drawer" role="dialog" aria-modal="true" aria-labelledby="settings-drawer-title"><div className="settings-drawer-top"><div><p className="eyebrow">Members & access</p><h2 id="settings-drawer-title">{drawer === "add" ? "Invite a named identity" : `Edit ${target?.displayName ?? "access"}`}</h2></div><button ref={closeButton} type="button" aria-label="Close panel" onClick={() => setDrawer(null)}>✕</button></div>{error && <Notice error>{error}</Notice>}{drawer === "add" ? <form onSubmit={event => void submitInvite(event)}><p className="muted">Use the recipient’s exact identity provider subject. Email or name alone cannot identify the right account.</p><label htmlFor="invite-subject">Exact provider subject</label><input id="invite-subject" value={subject} onChange={event => setSubject(event.target.value)} required maxLength={500} /><label htmlFor="invite-role">Church role</label><select id="invite-role" value={role} onChange={event => setRole(event.target.value)}>{offeredRoles.map(item => <option key={item} value={item}>{item}</option>)}</select><label htmlFor="invite-reason">Reason for invitation</label><textarea id="invite-reason" value={reason} onChange={event => setReason(event.target.value)} required maxLength={2000} /><p className="fine">The invited person must sign in with that exact identity and accept the token. Public study readers use church links without an account.</p><button className="primary" disabled={busy || !subject.trim() || !reason.trim()}>{busy ? "Creating…" : "Create invitation"}</button>{token && <div className="notice"><label htmlFor="settings-invite-token">Invitation token · share securely</label><textarea id="settings-invite-token" value={token} readOnly /><p>Send this token to the named person. They can redeem it at /onboarding while signed in. It is shown only now.</p></div>}</form> : target && <div><p className="muted">Identity: {target.userId}</p><p className="fine">Role replacement and status changes are audited. A separate policy-owner process is required for protected grants.</p><label htmlFor="edit-access-role">Role</label><select id="edit-access-role" value={role} onChange={event => setRole(event.target.value)}>{offeredRoles.map(item => <option key={item} value={item}>{item}</option>)}</select><label htmlFor="edit-access-reason">Reason for change</label><textarea id="edit-access-reason" value={reason} onChange={event => setReason(event.target.value)} required maxLength={2000} /><div className="settings-drawer-actions"><button className="primary" disabled={busy || !reason.trim() || role === roleOf(target)} onClick={() => void change("/members/roles", { userId: target.userId, role, reason: reason.trim() })}>Save role</button><button disabled={busy || !reason.trim()} onClick={() => void change("/members/status", { userId: target.userId, active: target.active === false, reason: reason.trim() })}>{target.active === false ? "Reactivate access" : "Deactivate access"}</button></div></div>}</aside></div>}
  </div>;
}
