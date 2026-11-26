import type { NextConfig } from "next";

// Baked into both the browser bundle and the server at build time: the update checker compares
// the version the phone is running with the version currently deployed.
const APP_VERSION = (process.env.VERCEL_GIT_COMMIT_SHA || `local-${Date.now().toString(36)}`).slice(0, 12);

const nextConfig: NextConfig = {
  env: { APP_VERSION, APP_BUILT_AT: new Date().toISOString() },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
