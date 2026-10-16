# Replit development preview

Replit is not a supported TradeClaw production target. The checked-in `.replit` file starts the Next.js development server for code exploration; the public `/replit` route redirects to `/start`.

## Open the development preview

1. Import `https://github.com/naimkatiman/tradeclaw` into a Replit App.
2. Let the `onBoot` task install the locked dependencies and build the shared signals package.
3. Select **Run** and use the URL shown in Replit's webview. Replit exposes the editor URL through `REPLIT_DEV_DOMAIN`; do not construct a legacy hostname.

Without PostgreSQL, database-backed routes and persistence are unavailable. This preview has not been verified for availability, backups, scheduled jobs, webhooks, or production traffic.

## Optional database-backed development

For local development inside Replit only:

1. Add a Replit SQL database or another PostgreSQL provider. Confirm that the Secrets tool exposes its connection string as `DATABASE_URL`.
2. Add strong `USER_SESSION_SECRET` and `ADMIN_SECRET` values in the Secrets tool. Do not commit them.
3. Apply the schema before starting the app:

   ```bash
   npm run migrate --workspace=apps/web
   ```

4. Select **Run** to start the development server.

Re-run migrations after pulling a revision that adds migration files. Replit's predefined development domain differs from a published deployment domain; consult the current [Replit environment-variable documentation](https://docs.replit.com/core-concepts/project-editor/app-setup/secrets) when configuring callbacks.

For a maintained production-oriented workflow, use [TradeClaw's start guide](https://tradeclaw.win/start).
