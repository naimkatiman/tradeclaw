# Fly.io deployment status

Fly.io is not currently a supported or end-to-end verified TradeClaw deployment target. The old configuration deployed a web-only image without the repository's PostgreSQL migration runner and incorrectly described TradeClaw as file-backed. The public `/fly` route now redirects to the supported `/start` workflow, and `fly.toml` is intentionally non-deployable.

Do not use the old `fly launch` or `fly deploy` instructions from a previous checkout. A production TradeClaw deployment requires all of the following:

- a PostgreSQL database exposed as `DATABASE_URL`;
- every migration in `apps/web/migrations` applied before the web server starts;
- strong `USER_SESSION_SECRET` and `ADMIN_SECRET` values;
- a migration-capable image, TLS, backups, monitoring, and a verified health check;
- current provider pricing reviewed before resources are created.

Fly.io Managed Postgres can attach a `DATABASE_URL` to an app, but that alone does not make this repository's Fly deployment supported. See the current [Fly Managed Postgres connection guide](https://fly.io/docs/mpg/create-and-connect/) and [Fly pricing](https://fly.io/docs/about/pricing/) if you are designing and testing your own deployment.

For the maintained self-host path, use [TradeClaw's start guide](https://tradeclaw.win/start).
