import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["boards.devonlabs.space"],

  // Keep Turbopack scoped to this app when parent folders also contain lockfiles.
  turbopack: {
    root: process.cwd(),
  },

  // Don't advertise the Next.js / framework version.
  poweredByHeader: false,

  // Treat better-sqlite3 as a native module (must not be bundled).
  serverExternalPackages: ["better-sqlite3"],

  // Security headers applied to every response, including API routes.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
