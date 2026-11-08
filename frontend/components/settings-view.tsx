"use client";

import type { Session } from "../lib/api";
import type { WorkspaceData } from "../lib/types";
import { SettingsMembers } from "./settings-members";
import { SettingsChurch } from "./settings-church";
import { SettingsReading } from "./settings-reading";
import { SettingsIntegrations } from "./settings-integrations";

export function SettingsView({ section, data, session, refresh }: { section: string; data: WorkspaceData; session: Session; refresh: () => Promise<void> }) {
  if (section === "members") return <SettingsMembers key={data.church.id} data={data} session={session} refresh={refresh} />;
  if (section === "church") return <SettingsChurch key={data.church.id} data={data} session={session} refresh={refresh} />;
  if (section === "reading") return <SettingsReading key={data.church.id} data={data} session={session} refresh={refresh} />;
  return <SettingsIntegrations key={data.church.id} data={data} session={session} />;
}
