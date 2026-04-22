import type { D1Database } from "@cloudflare/workers-types";

// Cloudflare Workers environment bindings.
// File exports (PDF/Excel) go to Google Drive — no R2 binding needed.
export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  GOOGLE_DRIVE_FOLDER_ID: string;
  GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON: string;
}

// Extracts the D1 database from the Cloudflare env.
// All Cloudflare-specific access is isolated to this file.
export function getDb(env: Env): D1Database {
  return env.DB;
}
