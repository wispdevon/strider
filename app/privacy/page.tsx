import Link from "next/link";

const sections = [
  {
    title: "1. Information We Collect",
    items: [
      "Account Information: Information you provide when you create an account or profile, such as name and email.",
      "Board and Project Data: Content you submit to run the Service, including boards, tasks, subtasks, assignments, invites, friend requests, categories, notes, and completion history.",
      "Authentication and Security Data: Information needed for sessions, passkeys, board access, passwords, join codes, PIN checks, and abuse prevention.",
      "Usage Data: Operational information about how the Service is accessed and used, such as requests, device or browser type, pages viewed, and interactions, where collected by the application host or service providers.",
      "Cookies and Similar Technologies: Essential and functional cookies or local storage used for authentication, security, sign-in continuity, board access, theme preferences, and interface preferences.",
    ],
  },
  {
    title: "2. How We Use Information",
    items: [
      "Provide, maintain, secure, and improve the Service.",
      "Operate boards, accounts, assignments, invites, passkeys, sessions, and collaboration features.",
      "Personalize requested features such as theme and interface preferences.",
      "Communicate with you about security, support, and service-related updates where applicable.",
      "Measure aggregate usage, troubleshoot issues, prevent abuse, and comply with legal obligations.",
    ],
  },
  {
    title: "3. Cookies and Tracking",
    body: [
      "We use essential and functional cookies and browser storage to operate the Service, authenticate users, maintain security, preserve sign-in and invite flows, remember theme and interface preferences, and support similar features you request.",
      "Strider does not use advertising trackers, retargeting pixels, cross-site tracking, or cookies to build marketing or behavioral profiles.",
    ],
  },
  {
    title: "4. Analytics and Service Providers",
    body: [
      "Strider may rely on hosting, database, authentication, logging, security, and deployment providers to operate and protect the Service. These providers process information on our behalf as needed to provide, secure, and improve the Service.",
      "The open source project does not include advertising analytics by default. If a production deployment enables privacy-focused analytics or operational monitoring, it should be used only for aggregate feature usage, reliability, abuse prevention, and service performance, not advertising, retargeting, cross-site tracking, or marketing profile building.",
    ],
  },
  {
    title: "5. Information Sharing",
    items: [
      "Vendors and Service Providers: We share information with trusted providers who assist in operating, securing, hosting, and improving the Service.",
      "Legal: We may disclose information to comply with law, regulation, or legal process, or to protect the rights, property, or safety of Strider, Devon Labs, our users, or others.",
      "Business Transfers: In connection with a merger, acquisition, financing, reorganization, or asset sale, information may be transferred.",
    ],
    body: [
      "We do not sell your personal information, use advertising trackers, or build marketing or behavioral profiles from analytics events.",
    ],
  },
  {
    title: "6. Data Retention",
    body: [
      "We retain information for as long as necessary to provide the Service, comply with legal obligations, resolve disputes, prevent abuse, and enforce agreements. Retention periods vary depending on the type of data and operational needs.",
    ],
  },
  {
    title: "7. Your Choices and Rights",
    items: [
      "Access, update, or delete certain account, board, and project information where the Service provides those controls.",
      "Opt out of non-essential communications where applicable.",
      "Request a copy of your data or object to certain processing, subject to applicable law and deployment-specific support channels.",
    ],
  },
  {
    title: "8. Children's Privacy",
    body: [
      "The Service is not directed to children under 13, or the equivalent minimum age defined by local law. If we learn that we have collected personal information from a child without appropriate consent, we will take steps to delete it.",
    ],
  },
  {
    title: "9. International Transfers",
    body: [
      "Your information may be processed in countries other than your own. Where required, we take steps to ensure appropriate safeguards for international transfers.",
    ],
  },
  {
    title: "10. Security",
    body: [
      "We employ reasonable administrative, technical, and physical measures to protect information. No method of transmission or storage is 100% secure.",
    ],
  },
  {
    title: "11. Changes to this Policy",
    body: [
      "We may update this Privacy Policy from time to time. If changes are material, we will take reasonable steps to notify users where appropriate. Your continued use of the Service after changes take effect means you accept the updated Policy.",
    ],
  },
  {
    title: "12. Contact",
    body: [
      "Questions about this Policy? Please contact us through the support channel listed on the Devon Labs website.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm font-semibold text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
        ← Back to Strider
      </Link>
      <article className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-[0_18px_50px_rgba(17,17,17,0.06)]">
        <p className="eyebrow text-[var(--accent)] text-[11px]">Privacy Policy</p>
        <h1 className="section-heading mt-2 text-4xl text-[var(--foreground)]">Privacy Policy</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">Last updated: July 11, 2026</p>
        <p className="mt-8 text-sm leading-7 text-[var(--foreground)]">
          This Privacy Policy explains how Strider collects, uses, and shares information
          when you use our website, applications, and services (collectively, the
          &quot;Service&quot;). By using the Service, you consent to this Policy.
        </p>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="section-heading text-xl text-[var(--foreground)]">{section.title}</h2>
              {section.body?.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-sm leading-7 text-[var(--foreground)]">
                  {paragraph}
                </p>
              ))}
              {section.items && (
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--foreground)]">
                  {section.items.map((item) => (
                    <li key={item} className="pl-4 before:mr-2 before:content-['-']">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
