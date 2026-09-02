import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so a stray lockfile above this folder is ignored.
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      { source: "/piyasa", destination: "/piyasa-ozeti", permanent: true },
      { source: "/tarama", destination: "/arama", permanent: true },
    ];
  },
  sassOptions: {
    // Lets any .scss file do `@use "abstracts" as *;` regardless of its depth.
    loadPaths: [path.join(process.cwd(), "src/styles")],
    includePaths: [path.join(process.cwd(), "src/styles")],
    silenceDeprecations: ["legacy-js-api"],
  },
};

export default nextConfig;
