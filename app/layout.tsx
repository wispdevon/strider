import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import GlobalHeader from "@/components/GlobalHeader";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const codeFont = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || process.env.RP_ORIGIN || "http://localhost:3000"),
  title: "Strider Flow - Project Flowboard",
  description: "Plan clearly, collaborate closely, and move meaningful work from idea to done.",
  applicationName: "Strider Flow",
  openGraph: {
    title: "Strider Flow - Work moves forward",
    description: "Plan clearly, collaborate closely, and move meaningful work from idea to done.",
    siteName: "Strider Flow",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Strider Flow - Work moves forward",
    description: "Plan clearly, collaborate closely, and move meaningful work from idea to done.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efece6" },
    { media: "(prefers-color-scheme: dark)", color: "#151617" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${codeFont.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (() => {
              try {
                const stored = localStorage.getItem('strider-theme');
                const theme = stored === 'dark' || stored === 'light'
                  ? stored
                  : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                document.documentElement.dataset.theme = theme;
              } catch {}
            })();
          `}
        </Script>
        <AuthProvider>
          <GlobalHeader />
          <main className="flex-1">
            {children}
          </main>
          <footer className="border-t border-[var(--border)] bg-[var(--header-surface)] px-6 py-4 text-xs text-[var(--muted)]">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Privacy: Strider does not collect data beyond what is necessary to run boards, accounts, assignments, and sessions.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a href="/privacy" className="hover:text-[var(--foreground)] transition-colors">
                  Privacy Policy
                </a>
                <a href="/license" className="hover:text-[var(--foreground)] transition-colors">
                  Apache-2.0 License
                </a>
                <a
                  href="https://github.com/wispdevon/strider"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--foreground)] transition-colors"
                >
                  GitHub
                </a>
                <a
                  href="https://devonlabs.space"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--foreground)] transition-colors"
                >
                  devonlabs.space
                </a>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
