import type { Slot } from "./types";

export function canEditStudy(capabilities: string[], slot: Slot, userId: string, permission: "plans:edit" | "content:edit") {
  return capabilities.includes(permission) && (slot.assigneeIds.includes(userId) || capabilities.some(capability => ["series:manage", "settings:manage", "admin:manage"].includes(capability)));
}
