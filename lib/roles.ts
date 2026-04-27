import type { UserRole } from "@/types";

/** admin + editor can log and edit transactions, manage members */
export function canWrite(role: UserRole): boolean {
  return role === "admin" || role === "editor";
}

/** admin only: soft-delete, user management, settings, approve registrations */
export function isAdmin(role: UserRole): boolean {
  return role === "admin";
}

/** member only: row-level self-service portal */
export function isMember(role: UserRole): boolean {
  return role === "member";
}
