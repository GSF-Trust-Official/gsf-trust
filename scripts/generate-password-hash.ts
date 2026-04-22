#!/usr/bin/env tsx
// Usage: npx tsx scripts/generate-password-hash.ts <password>
// Output the bcrypt hash to use in 002_seed_treasurer.sql
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Usage: npx tsx scripts/generate-password-hash.ts <password>");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
console.log(hash);
