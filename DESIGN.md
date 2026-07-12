# Strider Design and Passkey Replication Guide

This document is the implementation specification for reproducing Strider's visual language, personalized accent system, interaction behavior, and passkey authentication in another application. It describes the rules behind the interface, not just the current screens.

The reference implementation uses Next.js 16 App Router, React 19, Tailwind CSS 4, Framer Motion, SimpleWebAuthn, and SQLite. The visual system is portable. The authentication architecture can be moved to another database or framework as long as its trust boundaries remain intact.

## 1. Design Character

Strider is a quiet operational workspace with an editorial finish. It combines:

- Warm paper in light mode and graphite in dark mode.
- A faint dot grid that makes the page feel like a working surface.
- Soft opaque panels over translucent headers and lanes.
- Dark titanium emphasis instead of a bright brand color.
- A personal accent derived from the signed-in user's avatar.
- Compact controls, stable dimensions, and restrained motion.
- Display typography for identity and hierarchy; neutral sans text for work.

The interface should feel precise and tactile, but never decorative for its own sake. Content and actions carry the composition. Avoid large marketing heroes, nested cards, glowing gradients, excessive pills, oversized rounding, or a one-color theme.

## 2. Foundation

### Fonts

Load these fonts through `next/font/google` and expose them as CSS variables:

| Role | Font | Variable | Use |
| --- | --- | --- | --- |
| Body | Inter | `--font-body` | UI text, controls, paragraphs |
| Display | Space Grotesk 400/500/700 | `--font-display` | Product name, page titles, section headings, eyebrows |
| Code | Geist Mono | `--font-mono` | Join codes, identifiers, technical values |

Use `display: "swap"`. Apply the variables to `<html>` and use this fallback stack:

```css
body {
  font-family: var(--font-body), -apple-system, BlinkMacSystemFont,
    "Segoe UI", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
```

Headings use Space Grotesk at weight 700, line-height `1.08`, and letter-spacing `-0.03em`. Section headings use `-0.025em`. Eyebrows are 600 weight, uppercase, and use `0.18em` to `0.24em` tracking. Do not scale text continuously with viewport width.

### Color tokens

Never place raw theme colors throughout components. Copy this semantic token layer and consume it with `var(...)`:

```css
:root {
  color-scheme: light;
  --background: #efece6;
  --foreground: #17181b;
  --panel: #f8f6f2;
  --panel-strong: #e7e0d5;
  --border: rgba(23, 24, 27, 0.12);
  --muted: #6e7379;
  --accent: #1d1f23;
  --accent-soft: #ece7de;
  --accent-sheen: #b8b4ab;
  --accent-glow: rgba(29, 31, 35, 0.08);
  --profile-accent: #4b5563;
  --header-surface: rgba(248, 246, 242, 0.9);
  --header-strong: rgba(248, 246, 242, 0.96);
  --lane-surface: rgba(248, 246, 242, 0.75);
  --inset-highlight: rgba(255, 255, 255, 0.8);
}

[data-theme="dark"] {
  color-scheme: dark;
  --background: #151617;
  --foreground: #f2f0ea;
  --panel: #202224;
  --panel-strong: #2a2d30;
  --border: rgba(242, 240, 234, 0.13);
  --muted: #a6abb0;
  --accent: var(--profile-accent);
  --accent-soft: color-mix(in srgb, var(--profile-accent) 20%, #202224);
  --accent-sheen: color-mix(in srgb, var(--profile-accent) 52%, white);
  --accent-glow: color-mix(in srgb, var(--profile-accent) 22%, transparent);
  --header-surface: rgba(32, 34, 36, 0.9);
  --header-strong: rgba(32, 34, 36, 0.96);
  --lane-surface: rgba(32, 34, 36, 0.72);
  --inset-highlight: rgba(255, 255, 255, 0.06);
}
```

The roles are important:

| Token | Meaning |
| --- | --- |
| `background` | Page canvas; never use it as a raised card |
| `foreground` | Primary readable text |
| `panel` | Cards, menus, dialogs, inputs when they sit on the page |
| `panel-strong` | Inputs, secondary controls, selected-neutral states |
| `border` | All ordinary separation; intentionally low contrast |
| `muted` | Secondary labels and metadata |
| `accent` | Primary command, active focus, category emphasis |
| `accent-soft` | Selected rows, hover fills, drop targets |
| `accent-sheen` | Progress endpoints and subtle metallic highlights |
| `accent-glow` | Focus rings and accent-colored shadow tint |
| `header-surface` | Translucent sticky navigation |
| `lane-surface` | Kanban lanes and other broad work regions |

Reserve explicit semantic colors for states: red for destructive/error, green for success, and yellow for warnings. Keep their area small. Do not turn semantic colors into page themes.

### Canvas texture

The dot grid is part of the identity. It should be visible only after looking at the surface, not before:

```css
body {
  background-color: var(--background);
  background-image:
    radial-gradient(circle, rgba(23, 24, 27, 0.09) 1.2px, transparent 1.2px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.02));
  background-size: 18px 18px, cover;
  background-position: center;
}

[data-theme="dark"] body {
  background-image:
    radial-gradient(circle, rgba(242, 240, 234, 0.08) 1.2px, transparent 1.2px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01));
}
```

Do not apply this texture independently to the footer or cards. It belongs to the continuous page canvas.

## 3. Personalized Accenting

The personal accent is the key variation in an otherwise neutral system.

1. Generate or store a deterministic avatar seed for each user.
2. Select the avatar palette deterministically from that seed.
3. Return one stable, sufficiently saturated palette color as `avatarAccent` in the session response.
4. After session hydration, set it on the document root:

```tsx
useEffect(() => {
  if (user?.avatarAccent) {
    document.documentElement.style.setProperty('--profile-accent', user.avatarAccent);
  } else {
    document.documentElement.style.removeProperty('--profile-accent');
  }
}, [user?.avatarAccent]);
```

In light mode, the main accent remains titanium (`#1d1f23`) and the profile color is used selectively for identity controls. In dark mode, `--accent` aliases `--profile-accent`, so focus, selected states, primary controls, and progress treatments adopt the user's identity.

Use these reusable treatments:

```css
.profile-accent-button {
  background: var(--profile-accent);
  color: white;
  border-color: color-mix(in srgb, var(--profile-accent) 78%, black);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--profile-accent) 28%, transparent);
}

.profile-accent-link { color: var(--profile-accent); }

.profile-accent-tag {
  background: color-mix(in srgb, var(--profile-accent) 16%, white);
  color: color-mix(in srgb, var(--profile-accent) 76%, black);
}

[data-theme="dark"] .profile-accent-tag {
  background: color-mix(in srgb, var(--profile-accent) 20%, #202224);
  color: color-mix(in srgb, var(--profile-accent) 76%, white);
}
```

Validate generated accent colors against both themes. If arbitrary user colors are allowed, clamp or replace colors that fail WCAG contrast for the intended foreground. Never assume white text is readable on every accent.

## 4. Component Grammar

### Surfaces and hierarchy

Use visual depth sparingly:

- Page sections are unframed and full width.
- Work lanes use `lane-surface`, a 1px border, and a subtle inset top highlight.
- Repeated task or board cards use `panel`, a 1px border, and a low neutral shadow.
- Menus and dialogs use `panel`, a stronger shadow, and sit above an explicit backdrop.
- Inputs use `panel` or `panel-strong`, depending on the containing surface.
- Never put a decorative card around a section that already contains cards.

Reference elevation values:

```css
/* sticky header */
box-shadow: 0 8px 24px rgba(17, 17, 17, 0.04);

/* ordinary card */
box-shadow: 0 10px 30px rgba(17, 17, 17, 0.05);

/* hovered card */
box-shadow: 0 14px 36px rgba(17, 17, 17, 0.08);

/* floating menu */
box-shadow: 0 12px 40px rgba(17, 17, 17, 0.12);

/* primary control */
box-shadow: 0 8px 20px rgba(29, 31, 35, 0.16);
```

### Radius scale

Use a restrained radius hierarchy:

| Element | Radius |
| --- | --- |
| Inputs, icon buttons, command buttons | `8px` |
| Tags and avatars | Fully round only when semantically appropriate |
| Cards and floating menus | `12px` |
| Large dialogs and broad lanes | `16px` |

Do not make every control pill-shaped. Pills are for compact statuses, assignee groups, and binary labels.

### Buttons

All toolbar controls share a stable `40px` minimum height, centered content, `8px` radius, and `14px` text. On narrow screens, icon controls preserve a `40px` square hit target.

- Primary: `accent` fill, high-contrast text, accent border, soft shadow.
- Neutral: `panel` fill, standard border, foreground text; hover to `panel-strong`.
- Danger: translucent red fill and border, red text; never use as a routine action.
- Icon-only: use a familiar icon or Unicode symbol plus `aria-label` and `title`.
- Disabled: preserve layout and reduce opacity to 50%; prevent duplicate submission.

Use verbs that match the actual state transition. Keep routine stage controls short: `Advance` and `Back`.

### Inputs and focus

Inputs use foreground text, muted placeholders, an 8px radius, and the standard border. Standard height is `44px` for prominent form rows. Focus removes the browser outline and uses an accent border plus optional `2px` `accent-glow` ring. Adjacent inputs in the same row must have identical heights.

Labels are compact: `12px`, weight 600, uppercase only for short metadata labels. Error text is `14px` red and should appear near the failed control without moving unrelated layout.

### Cards and work items

Task cards use:

- `panel` background, standard border, 16px radius, and 16px padding.
- Category as 12px semibold uppercase accent text.
- Title as the strongest line; description as 12px muted text.
- Progress as a stable 8px track with an accent-to-sheen fill.
- Secondary command on `panel-strong`; advance command on `accent`.
- A drag state indicated by a low-opacity accent ring and reduced shadow.

The entire task card is the drag target. Do not add a separate drag handle unless precision or accessibility testing proves it necessary. Preserve horizontal card dimensions during drag with an explicit drag overlay; do not let sortable transforms shrink lanes or reflow siblings unexpectedly.

### Headers

Headers are sticky, translucent, and blurred:

```text
border-bottom: 1px solid var(--border)
background: var(--header-surface)
backdrop-filter: blur(24px)
position: sticky; top: 0; z-index: 50
```

The left side contains location and page identity. The right side contains global controls such as friends, theme, and profile. Detail pages combine navigation and global controls into one bar instead of stacking headers.

### Menus and dialogs

- Render fixed dialogs into `document.body` with a portal so transformed ancestors cannot break positioning.
- Backdrop: `rgba(0,0,0,0.5)`.
- Dialog: `panel`, standard border, 16px radius, strong shadow, maximum width near `448px`.
- Menu: 12px radius, maximum height with internal scrolling, and viewport-aware width.
- Close popovers on outside pointer interaction and support Escape in new implementations.
- Destructive dialogs must state impact and require explicit confirmation.

### Empty, loading, and error states

Loading states should preserve the page frame. Empty states belong inside the work region and use muted copy, not a new decorative illustration. Errors state what failed and leave the relevant retry action available. Avoid full-page interruptions for local failures.

## 5. Layout and Responsive Behavior

Use a maximum content width around `1280px` (`max-w-7xl`) with `24px` page padding. Dense work surfaces may use the full viewport width.

The board changes behavior at the same breakpoint where its lanes stack:

- Wide viewport: lanes form a horizontal multi-column board; tasks stack vertically inside each lane.
- Narrow viewport: lanes stack vertically; tasks become a horizontal, overflow-scrolling row inside each lane.
- Task rows use a stable minimum card width so content remains legible.
- Overflow belongs to the task strip, not the whole page, when lanes are vertical.

Use explicit `min-width`, grid tracks, aspect ratios, and control heights for interactive elements. Hover text, counters, assignment avatars, and loading labels must not resize their containers.

## 6. Motion Language

Motion confirms interaction; it does not decorate idle screens.

Use Framer Motion for stateful component transitions and CSS for simple color/focus changes:

| Interaction | Motion |
| --- | --- |
| Toolbar hover/tap | scale `1.05` / `0.95` |
| Wide primary button | scale `1.02` / `0.98` |
| Card hover | scale `1.02`, translate Y `-2px` only where layout permits |
| Popover enter | opacity `0→1`, Y `-4→0`, scale `0.95→1`, `150ms` |
| Dialog enter | backdrop fade; panel scale `0.9→1`, Y `20→0` |
| Progress segment | opacity and X-scale over `300ms`, staggered by `50ms` |
| Routine color/shadow | `200–300ms` ease |

Use `AnimatePresence` for conditional content and `mode="popLayout"` for sortable lists where removed items should not leave a snap. Dragging uses a fixed-size overlay with a grabbing cursor and neutral drop shadow.

Always add a reduced-motion path. Remove nonessential transforms and transitions under `prefers-reduced-motion: reduce`; preserve immediate state feedback.

## 7. Theme Implementation

Store the theme as `light` or `dark` in local storage. Before React hydration, run a small `beforeInteractive` script that:

1. Reads the stored preference.
2. Falls back to `prefers-color-scheme`.
3. Sets `document.documentElement.dataset.theme`.

Use `suppressHydrationWarning` on `<html>` because the pre-hydration script mutates that attribute. The client theme toggle updates both local storage and the root data attribute. This avoids the light-theme flash that occurs when theme selection waits for `useEffect`.

## 8. Passkey Architecture

### Dependencies and trust boundaries

Use matching major versions of:

```text
@simplewebauthn/browser  Browser ceremony helpers
@simplewebauthn/server   Option generation and cryptographic verification
```

Only the browser calls `startRegistration()` or `startAuthentication()` from the browser package. Only the server generates options, stores challenges, verifies responses, accesses credential public keys, and creates sessions.

Passkeys require a secure context. Production must use HTTPS. Localhost is accepted by browsers for local development.

### Environment

```dotenv
RP_ID=app.example.com
RP_ORIGIN=https://app.example.com
SESSION_SECRET=<at least 32 random bytes, stored outside source control>
```

- `RP_ID` is a hostname only: no protocol, port, or path.
- `RP_ORIGIN` is the exact browser origin, including protocol and a non-default port if used.
- Preview deployments on changing hostnames need an intentional relying-party strategy; a passkey registered for one unrelated domain will not work on another.
- Refuse production startup when `SESSION_SECRET` is missing.

### Required data

Store these records, regardless of database choice:

```text
users
  id, name, email?, created_at

passkey_credentials
  id, user_id, credential_id UNIQUE, public_key, counter,
  device_type, backed_up, transports?, created_at

webauthn_challenges
  id, user_id?, challenge, ceremony_type, expires_at, created_at

sessions
  id, user_id, token_hash UNIQUE, expires_at, created_at
```

The credential ID identifies a passkey. The public key verifies assertions. The signature counter must be updated after successful authentication. Transports are JSON data used to improve future authenticator prompts. Never store a private key: it remains with the user's authenticator.

### Registration sequence

```text
Browser                     Server                         Authenticator
   | POST /auth/register      |                                |
   |------------------------->| create pending user            |
   |                          | generateRegistrationOptions    |
   |                          | store challenge + expiry       |
   |<-------------------------| options, userId, challengeId   |
   | startRegistration(options)------------------------------->|
   |<------------------------------------------------ credential|
   | PUT /auth/register { userId, challengeId, credential }    |
   |------------------------->| atomically consume challenge   |
   |                          | verify challenge/origin/RP ID   |
   |                          | store credential public data   |
   |                          | create session                 |
   |<-------------------------| verified                       |
   | GET /auth/session        |                                |
```

Generate registration options with:

```ts
generateRegistrationOptions({
  rpName: 'Your Product',
  rpID: RP_ID,
  userName: user.name,
  userID: Buffer.from(user.id, 'utf8'),
  timeout: 60_000,
  excludeCredentials: existingPasskeys,
  authenticatorSelection: {
    residentKey: 'preferred',
    userVerification: 'preferred',
  },
});
```

`excludeCredentials` prevents the same authenticator from registering an already-known credential. If the application requires biometric/PIN verification on every ceremony, use `userVerification: 'required'` consistently in generation and verification policy.

At verification, require the exact challenge ID returned for this ceremony and bind it to the pending user. Verify with `expectedChallenge`, exact `expectedOrigin`, and exact `expectedRPID`. Save the credential only when `verified` and `registrationInfo` are present, then create the session.

### Authentication sequence

Strider uses discoverable login: it does not ask for a username first and does not restrict `allowCredentials` to one account.

```text
Browser                     Server                         Authenticator
   | POST /auth/login         |                                |
   |------------------------->| generateAuthenticationOptions  |
   |                          | store challenge + expiry       |
   |<-------------------------| options, challengeId           |
   | startAuthentication(options)----------------------------->|
   |<------------------------------------------------- assertion|
   | PUT /auth/login { challengeId, credential }               |
   |------------------------->| atomically consume challenge   |
   |                          | load credential public key     |
   |                          | verify assertion/origin/RP ID   |
   |                          | update signature counter       |
   |                          | create session                 |
   |<-------------------------| user summary                   |
   | GET /auth/session        |                                |
```

Generate options with `rpID`, a `60_000ms` timeout, and the selected user-verification policy. During verification, load the stored credential by `response.id`, reconstruct the public key bytes, pass its current counter and transports to SimpleWebAuthn, then persist `authenticationInfo.newCounter`.

### Session model

After either ceremony succeeds, issue a random opaque session token and persist the server-side session. The browser cookie must be:

```text
HttpOnly
Secure in production
SameSite=Lax
Path=/
Finite Max-Age (Strider uses seven days)
```

Prefer storing only a cryptographic hash of the opaque token in the database and signing or authenticated-encrypting the cookie value. Strider's current implementation stores the raw token server-side and encrypts the cookie with AES-256-CBC; when replicating it, upgrade this to authenticated encryption such as AES-GCM or a mature session library. Encryption without authentication does not provide tamper detection.

`GET /api/auth/session` is the client source of truth. It validates the cookie and expiration, loads the current user, and returns the user profile, avatar, and `avatarAccent`. `POST /api/auth/logout` deletes the server session and cookie.

The root `AuthProvider` should expose:

```ts
type AuthState = {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  checkSession(): Promise<void>;
  refreshAuth(): Promise<void>;
  logout(): Promise<void>;
};
```

Keep WebAuthn ceremony calls in the passkey component or a dedicated client service. Avoid duplicating registration and login request logic between the component and context.

### Passkey modal styling and behavior

The passkey UI should feel like the rest of the product, not like a separate identity provider:

- Neutral toolbar trigger labeled `Sign in with Passkey` or a compact profile control.
- Portal-rendered dialog on a 50% black backdrop.
- `panel` dialog surface, standard border, 16px radius, 32px padding, `448px` maximum width.
- Centered lock/key symbol, 24px display heading, muted explanatory sentence.
- Optional name field only in registration mode.
- Full-width 48px accent action and a quiet text control to switch modes.
- Processing state disables submission and retains button dimensions.
- Browser cancellation and unsupported-device errors appear as concise inline messages.
- Return focus to the trigger after closing and close on Escape in the replicated version.

Do not claim that biometrics are sent to the server. The server receives a signed WebAuthn response; biometric data and private keys remain on the authenticator.

## 9. Authentication Hardening Checklist

The following is required when transplanting the implementation into a production project:

- Make challenges single-use with an atomic read-and-delete transaction.
- Give challenges a short explicit expiry and reject expired records during verification.
- Store the ceremony type and reject a registration challenge in login or vice versa.
- Require the exact `challengeId`; do not fall back to a user's most recent challenge.
- Bind registration challenges to the pending user and browser flow.
- Delete or expire pending users when registration is abandoned.
- Rate-limit option generation and verification by IP plus account or challenge.
- Validate and length-limit names and email addresses before creating users.
- Keep `RP_ID` and allowed origins in server-only configuration.
- Use a token hash in the sessions table and authenticated cookie protection.
- Rotate or revoke sessions after security-sensitive profile changes.
- Add CSRF/same-origin protection to state-changing non-WebAuthn endpoints.
- Avoid logging challenges, credentials, assertions, cookies, tokens, or unnecessary personal data.
- Provide account recovery and additional-passkey enrollment before users depend on the service.
- Test platform authenticators, roaming security keys, synced passkeys, cancellation, counter behavior, and lost-device recovery.

Strider's current code has verbose authentication logging, challenge fallback during registration, and non-authenticated CBC cookie encryption. These are implementation details to improve, not patterns to copy unchanged.

## 10. Accessibility Contract

- Meet WCAG AA contrast for body text, muted text, focus indicators, and text on dynamic accents.
- Every icon-only control needs an accessible name and visible tooltip/title when its meaning is not universal.
- Keep pointer targets at least `40px` square for toolbar actions.
- Preserve keyboard focus order in menus, dialogs, boards, and assignment lists.
- Trap focus inside modal dialogs and restore it on close.
- Expose drag-and-drop alternatives for keyboard and assistive-technology users.
- Do not communicate stage, completion, warning, or assignment using color alone.
- Respect reduced motion and avoid essential information that appears only on hover.
- Use monospace and tabular numerals for codes so reveal/copy states do not shift width.

## 11. Replication Order

Implement the system in this order:

1. Install fonts and semantic color tokens.
2. Add pre-hydration theme selection and the canvas texture.
3. Build shared button, input, panel, menu, modal, and typography primitives.
4. Implement the header and responsive work-surface layout.
5. Add the avatar-derived `--profile-accent` after session hydration.
6. Add restrained motion and reduced-motion fallbacks.
7. Create the credential, challenge, and session schema.
8. Implement and test registration end to end.
9. Implement discoverable authentication and session refresh.
10. Add logout, recovery, additional passkeys, rate limits, and security tests.
11. Audit contrast, keyboard operation, responsive overflow, and theme hydration.

The replication is visually successful when the application still reads as Strider with the personal accent removed: warm paper, graphite, quiet depth, dense work-first layout, strong typographic hierarchy, and restrained motion. The accent should personalize that foundation, not replace it.

## 12. Source Map

Use these files as the canonical working examples:

| Concern | Source |
| --- | --- |
| Tokens, canvas, typography, shared controls | `app/globals.css` |
| Fonts, theme bootstrap, provider composition | `app/layout.tsx` |
| Theme control | `components/ThemeToggle.tsx` |
| Profile accent injection | `context/auth-context.tsx` |
| Passkey dialog and browser ceremonies | `components/PasskeyLogin.tsx` |
| Server WebAuthn ceremonies | `lib/auth.ts` |
| Session cookie and persistence | `lib/session.ts` |
| Registration endpoints | `app/api/auth/register/route.ts` |
| Authentication endpoints | `app/api/auth/login/route.ts` |
| Session endpoint | `app/api/auth/session/route.ts` |
| Credential persistence | `lib/users.ts` |
| Avatar palette and accent derivation | `lib/avatar.ts` |
| Board and drag/drop composition | `components/BoardView.tsx` |
| Work item styling | `components/ProjectCard.tsx` |
| Popover and multi-selection styling | `components/AssigneeSelector.tsx` |
