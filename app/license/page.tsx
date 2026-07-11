import Link from "next/link";

export default function LicensePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm font-semibold text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
        ← Back to Strider
      </Link>
      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-[0_18px_50px_rgba(17,17,17,0.06)]">
        <h1 className="section-heading text-3xl text-[var(--foreground)]">Apache License 2.0</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">Copyright 2026 Devon Labs</p>

        <div className="mt-8 space-y-5 text-sm leading-7 text-[var(--foreground)]">
          <p>
            Strider is licensed under the Apache License, Version 2.0. You may use,
            copy, modify, and distribute this software subject to the terms of that license.
          </p>
          <p>
            The Apache License 2.0 includes a permissive copyright license, an express
            patent grant, redistribution conditions, warranty disclaimers, and limitations
            of liability.
          </p>
          <p>
            The full license text is available in the project repository as <code>LICENSE</code>
            and from the Apache Software Foundation.
          </p>
          <a
            href="https://www.apache.org/licenses/LICENSE-2.0"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent)]/90"
          >
            View Apache License 2.0
          </a>
        </div>
      </div>
    </div>
  );
}
