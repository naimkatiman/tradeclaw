# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest (main) | ✅ |

## Reporting a Vulnerability

If you discover a security vulnerability in TradeClaw, **please do not open a public GitHub issue**.

Instead, report it privately:

- **Email:** naimkatiman@gmail.com
- **Subject:** `[TradeClaw Security] <brief description>`

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You'll get a response within **48 hours**. If confirmed, a patch will be released within **7 days** for critical issues.

## Security Scope

In scope:
- Authentication bypass
- Privilege escalation
- Remote code execution
- Data exposure (API keys, credentials)
- SSRF, XSS, SQL injection in dashboard or API routes

Out of scope:
- Issues requiring physical access to the server
- Social engineering attacks
- Denial of service (DoS)

## Best Practices for Self-Hosters

- Change `AUTH_SECRET` and `DB_PASSWORD` from defaults before deploying
- Never expose the dashboard publicly without auth enabled
- Run behind a reverse proxy (nginx, Caddy) with TLS
- Keep Docker images updated (`docker compose pull`)
- Do not commit `.env` to version control

## Disclosure

We follow responsible disclosure. Once a fix is released, we'll credit the reporter in the release notes (unless they prefer to remain anonymous).
