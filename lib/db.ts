import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

// Cloudflare Workers environment bindings
export interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  GOOGLE_DRIVE_FOLDER_ID: string;
}

// Extracts the D1 database from the Cloudflare env.
// All Cloudflare-specific access is isolated to this file.
export function getDb(env: Env): D1Database {
  return env.DB;
}
