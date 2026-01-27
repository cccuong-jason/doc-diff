import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable static page generation for pages with client-side only features
  output: 'standalone',

  // Use empty turbopack config to silence the warning
  turbopack: {
    resolveAlias: {
      canvas: { browser: './empty-module.js' },
    },
  },
};

export default nextConfig;
