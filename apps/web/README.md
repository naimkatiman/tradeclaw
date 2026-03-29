This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## API Access

Get a free API key at https://tradeclaw.win/api-keys

```bash
curl "https://tradeclaw.win/api/signals?api_key=YOUR_KEY"
# or
curl -H "Authorization: Bearer YOUR_KEY" https://tradeclaw.win/api/signals
```

Free tier: 1,000 requests/hour. Self-host for unlimited access.

<<<<<<< HEAD
=======
## Slack Integration

Get real-time trading signal alerts directly in your Slack channels.

**Setup:**
1. Create a [Slack Incoming Webhook](https://api.slack.com/messaging/webhooks) for your channel
2. Add the webhook URL at [tradeclaw.win/slack](https://tradeclaw.win/slack)
3. Receive formatted Block Kit signal alerts automatically

```bash
# Programmatic test signal
curl -X POST https://tradeclaw.win/api/slack/webhook \
  -H "Content-Type: application/json" \
  -d '{"action":"test","id":"YOUR_INTEGRATION_ID"}'
```

OAuth "Add to Slack" one-click install coming soon.

>>>>>>> origin/main
## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
