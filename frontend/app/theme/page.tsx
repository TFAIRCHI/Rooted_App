"use client";

import { useEffect, useState } from "react";
import { api, type Session } from "../../lib/api";
import { ThemeSettings } from "../../components/theme-settings";

export default function ThemePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [churchId, setChurchId] = useState("");
  useEffect(() => { api<Session>("/auth/session").then(result => { setSession(result.data); setChurchId(new URLSearchParams(window.location.search).get("church") ?? result.data.churches[0]?.id ?? ""); }).catch(() => setSession(null)); }, []);
  if (!session) return <main className="loading-screen" role="status"><span className="brand">Rooted</span><p>Opening church theme settings…</p></main>;
  return <ThemeSettings session={session} churchId={churchId} />;
}
