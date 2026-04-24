import type { D1Database } from "@cloudflare/workers-types";

// Extend the global CloudflareEnv with project-specific bindings so that
// getCloudflareContext().env.DB is typed without a cast everywhere.
declare global {
  interface CloudflareEnv {
    DB: D1Database;
    RESEND_API_KEY: string;
    GOOGLE_DRIVE_FOLDER_ID: string;
    GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON: string;
  }
}

// Kept for files that receive env explicitly (e.g. scripts, tests).
export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  GOOGLE_DRIVE_FOLDER_ID: string;
  GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON: string;
}

export function getDb(env: Pick<Env, "DB">): D1Database {
  return env.DB;
}
