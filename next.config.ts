import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  images: {
    // Cloudflare Workers has no image optimization server — serve as-is.
    unoptimized: true,
  },
};

export default nextConfig;
