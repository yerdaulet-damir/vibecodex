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
const REPO_URL = "https://github.com/yerdaulet-damir/vibecodex";
const NPM_CLI = "https://www.npmjs.com/package/@aimyerdaulet/vibecodex";
const NPM_MCP = "https://www.npmjs.com/package/@aimyerdaulet/vibecodex-mcp";
const AUTHOR_GH = "https://github.com/yerdaulet-damir";
const PUBLISHED_DATE = "2026-04-28";
const MODIFIED_DATE = "2026-05-06";

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

  authors: [{ name: "Yerdaulet Damir", url: AUTHOR_GH }],
  creator: "Yerdaulet Damir",
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
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },

  alternates: {
    canonical: SITE_URL,
  },

  category: "technology",
};

// ─── Structured data ────────────────────────────────────────────────────────

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "vibecodex",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  description:
    "Production architecture rules for AI-assisted coding — 54 numbered principles for FastAPI, Next.js 15, and Go 1.22+. Works with Claude Code and Cursor.",
  founder: {
    "@type": "Person",
    name: "Yerdaulet Damir",
    url: AUTHOR_GH,
    sameAs: [AUTHOR_GH, "https://www.npmjs.com/~aimyerdaulet"],
  },
  sameAs: [REPO_URL, NPM_CLI, NPM_MCP],
};

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "vibecodex",
  applicationCategory: "DeveloperApplication",
  applicationSubCategory: "CodeAssistant",
  operatingSystem: "Any",
  description:
    "54 production architecture principles that AI coding agents (Claude Code, Cursor) follow automatically. Drop-in CLAUDE.md, .cursor/rules, and .claude/skills for FastAPI, Next.js 15, and Go 1.22+ projects.",
  url: SITE_URL,
  downloadUrl: NPM_CLI,
  softwareVersion: "1.0.0",
  datePublished: PUBLISHED_DATE,
  dateModified: MODIFIED_DATE,
  inLanguage: "en",
  license: "https://opensource.org/licenses/MIT",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  author: {
    "@type": "Person",
    name: "Yerdaulet Damir",
    url: AUTHOR_GH,
    sameAs: [AUTHOR_GH, "https://www.npmjs.com/~aimyerdaulet"],
  },
  screenshot: `${SITE_URL}/opengraph-image`,
  keywords:
    "claude code, claude.md, cursor rules, vibe coding, fastapi, nextjs, golang, production architecture, ai coding",
};

const softwareSourceCodeSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: "vibecodex",
  codeRepository: REPO_URL,
  programmingLanguage: ["Python", "TypeScript", "Go"],
  runtimePlatform: ["Node.js", "Python 3.11+", "Go 1.22+"],
  license: "https://opensource.org/licenses/MIT",
  author: {
    "@type": "Person",
    name: "Yerdaulet Damir",
    url: AUTHOR_GH,
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is vibecodex?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "vibecodex is a set of 54 production architecture principles for AI-assisted coding. It ships as a single CLAUDE.md file plus Cursor rules and Claude Code skills that any AI coding agent loads automatically. Stacks covered: FastAPI (Python), Next.js 15 (TypeScript), and Go 1.22+.",
      },
    },
    {
      "@type": "Question",
      name: "What problem does vibecodex solve?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AI assistants produce structurally correct, locally optimal code, but they do not enforce architectural consistency at scale: layer boundaries, file size limits, single-writer invariants, bulkhead isolation, idempotency keys. Vibe-coded apps look great on Friday and turn into a 1,400-line router by Sunday. vibecodex encodes the rules so the AI follows them from line one — turning the agent from a fast junior into a disciplined senior.",
      },
    },
    {
      "@type": "Question",
      name: "How do I install vibecodex in my project?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Run `npx @aimyerdaulet/vibecodex init` in your project root, select your stack (FastAPI, Next.js 15, Go 1.22+, or all), and the CLI copies CLAUDE.md, .cursor/rules/, and .claude/skills/ into the repo. From the next session, Claude Code and Cursor follow the 54 principles automatically.",
      },
    },
    {
      "@type": "Question",
      name: "Which AI coding tools does vibecodex support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "vibecodex works with any AI agent that reads CLAUDE.md or Cursor rule files. Verified support: Claude Code (via CLAUDE.md and .claude/skills/), Cursor (via .cursor/rules/*.mdc). Compatible with any agent that respects repo-level instruction files. There is also an MCP server (@aimyerdaulet/vibecodex-mcp) that exposes the principles as tools to Claude Desktop.",
      },
    },
    {
      "@type": "Question",
      name: "Which stacks does vibecodex cover?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Three stacks with reference implementations: FastAPI on Python 3.11+ (18 principles across decomposition and integration), Next.js 15 on TypeScript 5 (16 principles including modern RSC patterns), and Go 1.22+ (20 principles for cmd/+internal/ services with bulkhead isolation and graceful shutdown).",
      },
    },
    {
      "@type": "Question",
      name: "Is vibecodex free and open source?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. vibecodex is MIT-licensed and free. Source code is at github.com/yerdaulet-damir/vibecodex. The CLI is published on npm as @aimyerdaulet/vibecodex and the MCP server as @aimyerdaulet/vibecodex-mcp.",
      },
    },
    {
      "@type": "Question",
      name: "How is vibecodex different from awesome-cursorrules or generic CLAUDE.md templates?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most cursor-rules and CLAUDE.md templates are unstructured prose lists. vibecodex is 54 numbered, atomic principles (A1–F10) with reference implementations and Claude Code skills attached. Each principle has a name, a one-line summary, an anti-pattern, and a code example you can grep for. The numbering makes it auditable: you can ask the AI 'does this follow B3?' and get a yes/no answer.",
      },
    },
  ],
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Install vibecodex in an existing project",
  description:
    "Add 54 production architecture principles to any FastAPI, Next.js 15, or Go 1.22+ project so Claude Code and Cursor follow them automatically.",
  totalTime: "PT1M",
  tool: [
    { "@type": "HowToTool", name: "Node.js 18+ with npx" },
    { "@type": "HowToTool", name: "An existing FastAPI, Next.js 15, or Go 1.22+ project" },
  ],
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Run the init command",
      text: "From your project root, run `npx @aimyerdaulet/vibecodex init`. The CLI prompts for your stack.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Select your stack",
      text: "Choose FastAPI (Python), Next.js 15 (TypeScript), Go 1.22+, or All stacks. The CLI copies CLAUDE.md, .cursor/rules/, and .claude/skills/ into your repo.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Start coding",
      text: "Open Claude Code or Cursor. The 54 principles are loaded from CLAUDE.md and .cursor/rules on the first prompt. The agent will produce a thin router, a service, and a repository protocol — not a 1,400-line monolith.",
    },
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSourceCodeSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
