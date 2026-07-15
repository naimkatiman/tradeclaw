"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bug,
  ExternalLink,
  FileText,
  Code2,
  Lock,
  Server,
  Shield,
} from "lucide-react";

const ASSESSMENT_AREAS = [
  "Broken access control",
  "Cryptographic failures",
  "Injection",
  "Insecure design",
  "Security misconfiguration",
  "Vulnerable and outdated components",
  "Identification and authentication failures",
  "Software and data integrity failures",
  "Security logging and monitoring failures",
  "Server-side request forgery",
];

const DECLARED_HEADERS = [
  { name: "X-Content-Type-Options", value: "nosniff" },
  { name: "X-Frame-Options", value: "SAMEORIGIN" },
  { name: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { name: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { name: "Content-Security-Policy", value: "Report-only policy set by middleware" },
];

export default function SecurityDashboardClient() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 pb-32 pt-28">
      <div className="mx-auto max-w-4xl space-y-12">
        <section className="space-y-4 border-b border-[var(--border)] pb-10">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            Not independently assessed
          </div>
          <h1 className="text-4xl font-bold md:text-5xl">Security posture</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)]">
            This page documents controls declared in the repository. TradeClaw has not completed an
            independent OWASP assessment, penetration test, or certified dependency audit, so no
            compliance grade or security score is claimed.
          </p>
        </section>

        <section className="space-y-5">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Shield className="h-6 w-6 text-emerald-400" />
            Assessment scope
          </h2>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            The OWASP Top 10 categories below are review areas, not pass/fail results. Each remains
            unassessed until evidence from a dated review is published.
          </p>
          <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {ASSESSMENT_AREAS.map((name, index) => (
              <div key={name} className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm"><span className="mr-3 font-mono text-zinc-500">A{String(index + 1).padStart(2, "0")}</span>{name}</span>
                <span className="shrink-0 text-xs text-amber-300">Not assessed</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Server className="h-6 w-6 text-emerald-400" />
            Declared response headers
          </h2>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            These values mirror the application configuration. They are not a live probe of a deployed
            reverse proxy, CDN, or browser response.
          </p>
          <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {DECLARED_HEADERS.map((header) => (
              <div key={header.name} className="py-3">
                <p className="font-mono text-sm font-semibold">{header.name}</p>
                <p className="mt-1 break-all font-mono text-xs text-[var(--text-secondary)]">{header.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 border-y border-[var(--border)] py-8 sm:grid-cols-3">
          <div>
            <Code2 className="mb-3 h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold">Source review</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Review the repository and deployment configuration directly.</p>
          </div>
          <div>
            <Lock className="mb-3 h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold">Self-hosting</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Docker Compose is available for deployments you operate.</p>
          </div>
          <div>
            <Bug className="mb-3 h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold">Disclosure</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Report suspected vulnerabilities through GitHub Security Advisories.</p>
          </div>
        </section>

        <section className="flex flex-wrap gap-3">
          <a
            href="https://github.com/naimkatiman/tradeclaw/security/advisories/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400"
          >
            <Bug className="h-4 w-4" /> Report a vulnerability <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://github.com/naimkatiman/tradeclaw/blob/main/SECURITY.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]"
          >
            <FileText className="h-4 w-4" /> Security policy <ExternalLink className="h-3 w-3" />
          </a>
          <Link href="/api/security/audit" className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]">
            JSON assessment status
          </Link>
        </section>
      </div>
    </main>
  );
}
