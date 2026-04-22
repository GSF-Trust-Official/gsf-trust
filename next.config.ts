import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

// Enable Cloudflare bindings (D1, R2, KV) during local `next dev`
if (process.env.NODE_ENV === "development") {
  const { setupDevPlatform } = await import(
    "@cloudflare/next-on-pages/next-dev"
  );
  await setupDevPlatform();
}

export default nextConfig;
