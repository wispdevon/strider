import type { Metadata } from "next";
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
  title: "Strider Flow - Project Flowboard",
  description: "Visual project workspaces with dynamic progress tracking",
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
          <footer className="animated-mosaic border-t border-[var(--border)] px-6 py-4 text-xs text-[var(--muted)]">
            <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
