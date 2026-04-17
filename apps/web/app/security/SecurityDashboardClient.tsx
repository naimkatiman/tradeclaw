"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lock,
  Eye,
  Bug,
  ExternalLink,
  FileText,
  Globe,
  Server,
  ChevronDown,
} from "lucide-react";

type Status = "pass" | "warn" | "fail";

interface OWASPItem {
  id: string;
  name: string;
  status: Status;
  detail: string;
}

const OWASP_ITEMS: OWASPItem[] = [
  { id: "A01", name: "Broken Access Control", status: "pass", detail: "Public routes only, no auth-gated data exposed" },
  { id: "A02", name: "Cryptographic Failures", status: "pass", detail: "HMAC-SHA256 webhook signing, secrets in env vars only" },
  { id: "A03", name: "Injection", status: "pass", detail: "No SQL/NoSQL, JSON file storage only, no query building" },
  { id: "A04", name: "Insecure Design", status: "warn", detail: "Single-node file storage not for production with sensitive data" },
  { id: "A05", name: "Security Misconfiguration", status: "pass", detail: "Security headers, CSP, X-Frame-Options configured" },
  { id: "A06", name: "Vulnerable Components", status: "pass", detail: "Dependabot enabled, regular audits" },
  { id: "A07", name: "Auth Failures", status: "pass", detail: "No auth = no auth bypass vulnerabilities in public mode" },
  { id: "A08", name: "Software Integrity", status: "pass", detail: "npm lockfile committed, GitHub Actions CI pipeline" },
  { id: "A09", name: "Logging Failures", status: "warn", detail: "File-based logging only, no centralized SIEM" },
  { id: "A10", name: "SSRF", status: "pass", detail: "External fetches validated to allowlist domains (Binance, Yahoo)" },
];

interface SecurityHeader {
  name: string;
  value: string;
}

const SECURITY_HEADERS: SecurityHeader[] = [
  { name: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none'" },
  { name: "X-Content-Type-Options", value: "nosniff" },
  { name: "X-Frame-Options", value: "DENY" },
  { name: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { name: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

interface TrustSignal {
  icon: typeof Shield;
  title: string;
  description: string;
}

const TRUST_SIGNALS: TrustSignal[] = [
  { icon: Eye, title: "100% Open Source", description: "Every line of code is publicly auditable on GitHub. No hidden backdoors, no obfuscated logic." },
  { icon: Lock, title: "Self-Hostable", description: "Run TradeClaw on your own infrastructure. Your data never leaves your server." },
  { icon: Bug, title: "Responsible Disclosure", description: "We follow industry-standard vulnerability disclosure via GitHub Security Advisories." },
  { icon: Globe, title: "No Tracking", description: "Zero analytics trackers, no third-party cookies, no fingerprinting. Your trading data stays private." },
];

function StatusIcon({ status }: { status: Status }) {
  if (status === "pass") return <CheckCircle className="w-5 h-5 text-emerald-400" />;
  if (status === "warn") return <AlertTriangle className="w-5 h-5 text-zinc-400" />;
  return <XCircle className="w-5 h-5 text-rose-400" />;
}

function statusBg(status: Status): string {
  if (status === "pass") return "border-emerald-500/20 bg-emerald-500/5";
  if (status === "warn") return "border-zinc-500/20 bg-zinc-500/5";
  return "border-rose-500/20 bg-rose-500/5";
}

function statusLabel(status: Status): string {
  if (status === "pass") return "Pass";
  if (status === "warn") return "Warning";
  return "Fail";
}

export default function SecurityDashboardClient() {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const passCount = OWASP_ITEMS.filter((i) => i.status === "pass").length;
  const warnCount = OWASP_ITEMS.filter((i) => i.status === "warn").length;
  const failCount = OWASP_ITEMS.filter((i) => i.status === "fail").length;
  const score = Math.round(((passCount + warnCount * 0.5) / OWASP_ITEMS.length) * 100);

  return (
    <main className="min-h-screen bg-[var(--background)] pt-28 pb-32 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Hero */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-sm font-medium">
            <ShieldCheck className="w-4 h-4" />
            Security Score: {score}/100
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Security &amp; Trust
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            TradeClaw is built with security-first principles. Open source, self-hostable,
            and transparent — so you can verify every claim yourself.
          </p>
        </section>

        {/* Trust Signals */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TRUST_SIGNALS.map((signal) => (
            <div
              key={signal.title}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 space-y-3"
            >
              <signal.icon className="w-8 h-8 text-emerald-400" />
              <h3 className="text-lg font-semibold">{signal.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {signal.description}
              </p>
            </div>
          ))}
        </section>

        {/* OWASP Top 10 */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-emerald-400" />
              OWASP Top 10 Compliance
            </h2>
            <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> {passCount}
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-zinc-400" /> {warnCount}
              </span>
              {failCount > 0 && (
                <span className="flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-rose-400" /> {failCount}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {OWASP_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                className={`w-full text-left rounded-xl border p-4 transition-colors ${statusBg(item.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={item.status} />
                    <div>
                      <span className="text-xs font-mono text-[var(--text-secondary)]">{item.id}</span>
                      <span className="mx-2 text-sm font-medium">{item.name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        item.status === "pass" ? "bg-emerald-500/10 text-emerald-400" :
                        item.status === "warn" ? "bg-zinc-500/10 text-zinc-400" :
                        "bg-rose-500/10 text-rose-400"
                      }`}>
                        {statusLabel(item.status)}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${expandedItem === item.id ? "rotate-180" : ""}`} />
                </div>
                {expandedItem === item.id && (
                  <p className="mt-3 text-sm text-[var(--text-secondary)] pl-8">
                    {item.detail}
                  </p>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Security Headers */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Server className="w-6 h-6 text-emerald-400" />
            Security Headers
          </h2>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
            {SECURITY_HEADERS.map((header, i) => (
              <div
                key={header.name}
                className={`p-4 ${i < SECURITY_HEADERS.length - 1 ? "border-b border-[var(--border)]" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold font-mono">{header.name}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 break-all font-mono">
                      {header.value}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Vulnerability Disclosure */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bug className="w-6 h-6 text-emerald-400" />
            Vulnerability Disclosure
          </h2>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 space-y-4">
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Found a security vulnerability? We take all reports seriously and follow responsible
              disclosure practices. Please report vulnerabilities through GitHub Security Advisories.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://github.com/naimkatiman/tradeclaw/security/advisories/new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
              >
                <Bug className="w-4 h-4" />
                Report a Vulnerability
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://github.com/naimkatiman/tradeclaw/blob/main/SECURITY.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-[var(--text-secondary)] text-sm font-medium hover:bg-white/10 transition-colors border border-[var(--border)]"
              >
                <FileText className="w-4 h-4" />
                Security Policy
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </section>

        {/* API Endpoints */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6 text-emerald-400" />
            Security API Endpoints
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { path: "/.well-known/security.txt", label: "security.txt", description: "RFC 9116 security contact" },
              { path: "/api/security/audit", label: "Audit API", description: "JSON audit report" },
              { path: "/api/security/headers", label: "Headers API", description: "Security headers config" },
            ].map((endpoint) => (
              <Link
                key={endpoint.path}
                href={endpoint.path}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 hover:border-emerald-500/30 transition-colors group"
              >
                <p className="text-xs font-mono text-emerald-400 group-hover:text-emerald-300">
                  GET {endpoint.path}
                </p>
                <p className="text-sm font-semibold mt-1">{endpoint.label}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{endpoint.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <section className="text-center space-y-4 pt-4">
          <p className="text-sm text-[var(--text-secondary)]">
            TradeClaw is open source. Verify our security claims yourself.
          </p>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/90 text-black text-sm font-semibold hover:bg-white transition-all"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            View Source on GitHub
            <ExternalLink className="w-3 h-3" />
          </a>
        </section>
      </div>
    </main>
  );
}
