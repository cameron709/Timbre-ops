import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/api/jobs/*/email/sync": ["./node_modules/@napi-rs/canvas*/**/*", "./node_modules/pdf-parse/dist/**/*", "./node_modules/pdfjs-dist/legacy/build/**/*"]
  },
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;
