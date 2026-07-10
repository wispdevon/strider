# Deploying Strider to the Public Internet

This guide covers the hardening applied to make Strider safe to expose publicly
and the steps required before going live.

## What was hardened for internet exposure

1. **Project API authorization (critical).** `GET/POST /api/projects`,
   `PUT/DELETE /api/projects/[id]`, and the subtask PATCH endpoint previously had
   **no authentication at all** - anyone could read, create, edit, or delete every
   project. They now enforce the same board access model used by the boards API:
   - Public boards (no owner, no passkey, no password) are readable by anyone.
   - Account-owned, passkey-protected, and password-protected boards require an
     authenticated board member.
   - All mutations require an authenticated board member.
   See `lib/board-access.ts` (`authorizeBoardRead` / `authorizeBoardWrite`).

2. **Session secret.** `lib/session.ts` now refuses to start in production unless
   `SESSION_SECRET` is set (previously it fell back to a hardcoded, public value
   that would let anyone forge sessions).

3. **Session cookie.** `secure` is enabled automatically in production; the cookie
   is `httpOnly` + `sameSite: lax`.

4. **Security headers.** `next.config.ts` adds `X-Content-Type-Options`,
   `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and a
   `Content-Security-Policy` (with `frame-ancestors 'none'`), and disables the
   `x-powered-by` header.

5. **Rate limiting.** `proxy.ts` applies per-IP token-bucket limits to API auth,
   board, project, friend, invite, and avatar routes to blunt brute-force and
   scraping.

6. **`better-sqlite3`** is marked as a server-external package so it is not
   bundled.

7. **Secrets hygiene.** `.gitignore` ignores `.env` / `.env.local` while keeping
   `.env.example` tracked. A `scripts/gen-env.js` helper generates a `.env` with a
   random `SESSION_SECRET`.

## Pre-deploy checklist

- [ ] Generate secrets: `node scripts/gen-env.js` (creates `.env`).
- [ ] The generated `.env` targets the production domain:
  - `SESSION_SECRET` - a unique 48-byte random string.
  - `RP_ID=boards.devonlabs.space` and `RP_ORIGIN=https://boards.devonlabs.space` -
    **must match the hostname users actually visit** (WebAuthn requires an exact match).
  - `HOSTNAME=127.0.0.1` and `PORT=3000` - Next.js binds to localhost only; Caddy
    is the sole public entrypoint.
- [ ] Run a production build: `npm run build`.
- [ ] Start in production mode: `npm start` (`next start` reads `HOSTNAME`/`PORT`).
- [ ] **Run Caddy** with the provided `Caddyfile` (see below) so TLS is terminated
  and the app is reachable at `https://boards.devonlabs.space`.
- [ ] **Remove or protect the default "My Workspace" board** (`my-workspace`,
  join code `DEFAULT1`, PIN `123456`) before exposing the app, or set a password /
  enable passkey on it. It is created automatically on first run and is
  world-readable. Because it is public by design, its projects are readable by
  anyone until you protect or remove it.

## Caddy (reverse proxy + TLS)

DNS records only map `boards.devonlabs.space` to an IP address; they do not
select a port. For normal browser access, expose ports **80** and **443** on the
host/router and let Caddy proxy to Next.js on `127.0.0.1:3000`. Keep port 3000
private unless you intentionally want users to type `:3000` and skip the HTTPS
proxy.

A `Caddyfile` is provided. It:
- Terminates TLS for `boards.devonlabs.space` automatically (ACME / Let's Encrypt).
- Serves the same app on your **local network** at `boards.lan` using Caddy's
  built-in CA (`tls internal`) so LAN access is also HTTPS.
- Forwards `X-Forwarded-For` / `X-Forwarded-Proto` / `X-Real-IP`, which Strider's
  rate limiter (`proxy.ts`) and secure session cookies depend on.

Run it:

```bash
caddy run --config Caddyfile
# or, to reload after edits:
caddy reload --config Caddyfile
```

### Accessing from the local network

Point LAN devices at `boards.lan` (resolve it to this machine's LAN IP via your
router's DNS or each device's `hosts` file). On first use, install Caddy's root
CA on each device so the self-signed `boards.lan` certificate is trusted:

```bash
caddy trust        # macOS/Linux (adds Caddy root to the system trust store)
```

On Windows, export the root (`caddy trust` is limited) or import
`%LOCALAPPDATA%\Caddy\pki\authorities\local\root.crt` into "Trusted Root
Certification Authorities" via `certmgr.msc`.

### WebAuthn caveat for LAN access

WebAuthn passkeys are bound to the `RP_ID`. With `RP_ID=boards.devonlabs.space`,
passkey logins only work when you visit `https://boards.devonlabs.space` - not
`boards.lan` or a raw LAN IP. If you want passkey logins from the LAN hostname,
set `RP_ID=boards.lan` (and re-register passkeys) in a LAN-specific env, or use
password/board-join on LAN and passkeys only over the public domain.

## Note on rate limiting

The limiter in `proxy.ts` keeps state in process memory and covers API auth,
board, project, friend, invite, and avatar routes. It is sufficient for a
single-instance deployment. If you run multiple instances behind a load balancer,
enforce rate limits (and WAF rules) at the proxy/CDN layer as well.

## Backup

The SQLite database lives at `data/strider.sqlite` (git-ignored). Back it up
regularly; it contains all boards, projects, users, and passkeys.
