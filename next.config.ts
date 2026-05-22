import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages compatibility: no Node.js-only APIs at runtime
  // Will add: experimental.runtime = 'edge' per-route when needed
};

export default nextConfig;
