import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://vibecodex-omega.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "vibecodex — 54 production principles for AI-assisted coding",
    template: "%s | vibecodex",
  },

  description:
    "Architecture rules your AI follows automatically. 54 numbered principles for FastAPI, Next.js 15, and Go 1.22+. Copy CLAUDE.md and .cursor/rules into any project — every Claude session follows production patterns from line one.",

  keywords: [
    "claude code",
    "claude.md",
    "cursor rules",
    "vibe coding",
    "vibe-coding architecture",
    "ai coding best practices",
    "production architecture",
    "fastapi architecture",
    "fastapi best practices",
    "nextjs 15 architecture",
    "nextjs best practices",
    "golang patterns",
    "go 1.22 architecture",
    "clean architecture fastapi",
    "hexagonal architecture",
    "ai-assisted coding",
    "claude code rules",
    "cursor ai rules",
    "coding agent skills",
    "production principles",
  ],

  authors: [{ name: "yerdaulet-damir", url: "https://github.com/yerdaulet-damir" }],
  creator: "yerdaulet-damir",
  publisher: "vibecodex",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },

  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "vibecodex",
    title: "vibecodex — production architecture for AI-assisted coding",
    description:
      "54 principles that prevent your vibe-coded app from breaking in production. FastAPI · Next.js 15 · Go 1.22+. One command setup.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "vibecodex — 54 production principles for AI-assisted coding",
      },
    ],
    locale: "en_US",
  },

  twitter: {
    card: "summary_large_image",
    title: "vibecodex — production architecture for AI-assisted coding",
    description:
      "54 principles your Claude follows automatically. FastAPI · Next.js 15 · Go. npx @aimyerdaulet/vibecodex init",
    images: ["/opengraph-image"],
    creator: "@vibecodex",
  },

  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },

  alternates: {
    canonical: SITE_URL,
  },

  category: "technology",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "vibecodex",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
  description:
    "Production architecture rules for AI-assisted coding. 54 principles for FastAPI, Next.js 15, and Go 1.22+. Works with Claude Code and Cursor.",
  url: SITE_URL,
  downloadUrl: "https://www.npmjs.com/package/@aimyerdaulet/vibecodex",
  softwareVersion: "1.0.0",
  license: "https://opensource.org/licenses/MIT",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Person",
    name: "yerdaulet-damir",
    url: "https://github.com/yerdaulet-damir",
  },
  codeRepository: "https://github.com/yerdaulet-damir/vibecodex",
  programmingLanguage: ["Python", "TypeScript", "Go"],
  keywords:
    "claude code, cursor rules, vibe coding, fastapi, nextjs, golang, production architecture, ai coding",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
