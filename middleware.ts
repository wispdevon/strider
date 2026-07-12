import { NextResponse, type NextRequest } from "next/server";

/**
 * Lightweight in-memory rate limiting.
 *
 * The default board API and the passkey auth endpoints are the most exposed
 * surfaces on a public deployment. We apply per-IP token-bucket limits to blunt
 * brute-force and scraping. State is process-local, which is adequate for a
 * single-instance deployment; behind multiple instances, enforce limits at the
 * proxy/CDN layer as well.
 */

type Bucket = { tokens: number; updatedAt: number };

const limits: Record<string, { windowMs: number; max: number }> = {
  // Auth challenges / verifications are the highest-value brute-force target.
  "/api/auth/login": { windowMs: 60_000, max: 10 },
  "/api/auth/register": { windowMs: 60_000, max: 10 },
  "/api/auth/avatar": { windowMs: 60_000, max: 30 },
  // Public board listing / joining.
  "/api/boards": { windowMs: 60_000, max: 60 },
  "/api/projects": { windowMs: 60_000, max: 120 },
  "/api/friends": { windowMs: 60_000, max: 60 },
  "/api/invites": { windowMs: 60_000, max: 60 },
};

const buckets = new Map<string, Bucket>();

function pickLimit(pathname: string) {
  const match = Object.keys(limits)
    .filter((route) => pathname === route || pathname.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length)[0];
  if (match) return limits[match];
  return null;
}

function isMutation(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method);
}

function hasTrustedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host;
    const requestHosts = [
      request.headers.get("host"),
      request.headers.get("x-forwarded-host"),
      request.nextUrl.host,
    ].filter(Boolean);

    return requestHosts.includes(originHost);
  } catch {
    return false;
  }
}

function rateLimit(key: string, limit: { windowMs: number; max: number }): boolean {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: limit.max, updatedAt: now };

  const refill = (now - bucket.updatedAt) / limit.windowMs;
  bucket.tokens = Math.min(limit.max, bucket.tokens + refill * limit.max);
  bucket.updatedAt = now;

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return false;
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return true;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/") && isMutation(request.method) && !hasTrustedOrigin(request)) {
    return new NextResponse(
      JSON.stringify({ error: "Cross-site API requests are not allowed." }),
      { status: 403, headers: { "content-type": "application/json" } }
    );
  }

  const limit = pickLimit(pathname);
  if (!limit) return NextResponse.next();

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const key = `${ip}:${pathname}`;

  if (!rateLimit(key, limit)) {
    return new NextResponse(
      JSON.stringify({ error: "Too many requests, please slow down." }),
      { status: 429, headers: { "content-type": "application/json" } }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
