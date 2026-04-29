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

export const metadata: Metadata = {
  title: "vibecodex — 54 production principles for AI-assisted coding",
  description: "Architecture rules your AI follows automatically. 54 numbered principles for FastAPI, Next.js 15, and Go 1.22+. Copy CLAUDE.md, .cursor/rules, and .claude/skills into any project.",
  keywords: ["vibe coding", "claude code", "cursor rules", "fastapi architecture", "nextjs best practices", "golang patterns", "ai coding"],
  openGraph: {
    title: "vibecodex — production architecture for AI-assisted coding",
    description: "54 principles that prevent your vibe-coded app from breaking after 3 months.",
    url: "https://vibecodex.dev",
    siteName: "vibecodex",
    type: "website",
  },
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
