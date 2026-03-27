import type { Metadata } from 'next';
import { CodeBlock } from '../components/code-block';
import { PageNav } from '../components/page-nav';
import { getPrevNext } from '../nav-config';

export const metadata: Metadata = {
  title: 'Webhooks',
  description: 'Real-time event delivery via HMAC-SHA256 signed webhooks — setup, payload schema, retry logic, and receiver examples.',
};

export default function WebhooksPage() {
  const { prev, next } = getPrevNext('/docs/webhooks');

  return (
    <article>
      <div className="mb-10">
        <p className="text-sm text-emerald-400 font-medium mb-2">Integrations</p>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-4">Webhooks</h1>
        <p className="text-lg text-zinc-400 leading-relaxed">
          TradeClaw can push signal and price events to any URL in real time.
          Each delivery is signed with HMAC-SHA256 so your receiver can verify
          the payload came from your instance — not a third party.
        </p>
      </div>

      {/* Setup */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Setup via the UI</h2>
        <p className="text-zinc-400 mb-5 leading-relaxed">
          Navigate to <strong className="text-zinc-200">Settings → Webhooks</strong> in the dashboard.
          Click <strong className="text-zinc-200">Add Webhook</strong>, enter your endpoint URL,
          optionally provide a secret, and save. You can test delivery immediately from the same panel.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {[
            { step: '1', title: 'Enter URL', desc: 'HTTPS endpoint that accepts POST requests' },
            { step: '2', title: 'Set Secret', desc: 'Optional. Used to sign and verify payloads' },
            { step: '3', title: 'Test Delivery', desc: 'Send a sample payload to confirm connectivity' },
          ].map(s => (
            <div key={s.step} className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-3">
                <span className="text-xs font-bold text-emerald-400">{s.step}</span>
              </div>
              <p className="text-sm font-medium text-zinc-200 mb-1">{s.title}</p>
              <p className="text-xs text-zinc-500">{s.desc}</p>
            </div>
          ))}
        </div>
        <CodeBlock
          language="bash"
          filename="Or create via API"
          code={`curl -X POST https://your-instance.com/api/webhooks \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-app.com/webhooks/tradeclaw",
    "name": "My Signal Receiver",
    "secret": "whsec_your_secret_here"
  }'

# Response
{
  "id": "wh_abc123",
  "url": "https://your-app.com/webhooks/tradeclaw",
  "name": "My Signal Receiver",
  "enabled": true,
  "createdAt": "2026-03-27T12:00:00Z"
}`}
        />
      </section>

      {/* Signing */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-2">HMAC-SHA256 Signing</h2>
        <p className="text-zinc-400 mb-5 leading-relaxed">
          Every delivery includes an <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">X-TradeClaw-Signature</code> header.
          The value is the HMAC-SHA256 of the raw request body using your webhook secret as the key,
          encoded as a hex string prefixed with <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">sha256=</code>.
        </p>
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] mb-5 font-mono text-xs text-zinc-400 leading-loose">
          <p><span className="text-zinc-500">Header:</span> X-TradeClaw-Signature</p>
          <p><span className="text-zinc-500">Value:</span> sha256=&lt;hex(HMAC-SHA256(secret, rawBody))&gt;</p>
          <p><span className="text-zinc-500">Also includes:</span> X-TradeClaw-Delivery (unique delivery ID)</p>
          <p><span className="text-zinc-500">Also includes:</span> X-TradeClaw-Event (event type string)</p>
        </div>
        <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4 text-sm text-zinc-400 mb-5">
          <strong className="text-amber-400">Important:</strong> Always verify the signature before processing
          the payload. Use a constant-time comparison to prevent timing attacks.
        </div>
        <CodeBlock
          language="javascript"
          filename="Node.js — signature verification"
          code={`const crypto = require('crypto');

function verifySignature(secret, rawBody, signatureHeader) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'utf8'),
    Buffer.from(signatureHeader, 'utf8')
  );
}

// Express receiver
app.post('/webhooks/tradeclaw', express.raw({ type: '*/*' }), (req, res) => {
  const sig = req.headers['x-tradeclaw-signature'];
  if (!verifySignature(process.env.WEBHOOK_SECRET, req.body, sig)) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body.toString());
  console.log('Event type:', event.type);
  res.sendStatus(200);
});`}
        />
      </section>

      {/* Payload schema */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Payload Schema</h2>
        <p className="text-zinc-400 mb-5 leading-relaxed">
          All webhook payloads share a common envelope. The <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">data</code> field
          contains the event-specific object.
        </p>
        <CodeBlock
          language="typescript"
          code={`interface WebhookPayload {
  id: string;          // Unique delivery ID (same as X-TradeClaw-Delivery)
  type: WebhookEventType;
  createdAt: string;   // ISO 8601
  data: SignalEvent | PriceEvent | AlertEvent;
}

type WebhookEventType =
  | 'signal.created'
  | 'signal.updated'
  | 'price.alert'
  | 'tp.hit'
  | 'sl.hit';

// signal.created example
{
  "id": "del_xyz789",
  "type": "signal.created",
  "createdAt": "2026-03-27T14:30:00Z",
  "data": {
    "id": "sig_abc123",
    "symbol": "XAUUSD",
    "timeframe": "H1",
    "direction": "BUY",
    "confidence": 87,
    "entryPrice": 2345.50,
    "tp1": 2360.00, "tp2": 2374.50, "tp3": 2389.00,
    "sl": 2331.00
  }
}`}
        />
      </section>

      {/* Discord / Slack */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Discord &amp; Slack Auto-Formatting</h2>
        <p className="text-zinc-400 mb-5 leading-relaxed">
          TradeClaw detects Discord and Slack webhook URLs automatically and sends rich formatted
          messages instead of raw JSON — no middleware required.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
            <p className="text-sm font-medium text-zinc-200 mb-2">Discord</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Sends an <strong className="text-zinc-400">embed</strong> with colored sidebar
              (green for BUY, red for SELL), symbol, direction, confidence, entry, TP levels, and SL.
              URLs matching <code className="text-emerald-400">discord.com/api/webhooks</code> are auto-detected.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
            <p className="text-sm font-medium text-zinc-200 mb-2">Slack</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Sends a <strong className="text-zinc-400">Block Kit</strong> message with sections
              and context blocks. URLs matching <code className="text-emerald-400">hooks.slack.com</code> are
              auto-detected and formatted accordingly.
            </p>
          </div>
        </div>
      </section>

      {/* Retry logic */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Retry Logic</h2>
        <p className="text-zinc-400 mb-5 leading-relaxed">
          If your endpoint returns a non-2xx status code or times out, TradeClaw retries
          with exponential backoff. A delivery is considered failed after 3 attempts.
        </p>
        <div className="rounded-xl border border-white/6 overflow-hidden mb-5">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/6 bg-white/[0.02]">
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Attempt</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Delay</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Timeout</th>
              </tr>
            </thead>
            <tbody>
              {[
                { attempt: '1st (initial)', delay: 'Immediate', timeout: '5s' },
                { attempt: '2nd', delay: '5 seconds', timeout: '5s' },
                { attempt: '3rd (final)', delay: '25 seconds', timeout: '5s' },
              ].map(row => (
                <tr key={row.attempt} className="border-b border-white/4 last:border-0">
                  <td className="px-4 py-3 text-sm text-zinc-300">{row.attempt}</td>
                  <td className="px-4 py-3 text-sm font-mono text-emerald-400">{row.delay}</td>
                  <td className="px-4 py-3 text-sm font-mono text-zinc-400">{row.timeout}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-zinc-500">
          View delivery history and retry status at{' '}
          <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">GET /api/webhooks/[id]/deliveries</code>.
          Trigger a manual redeliver with{' '}
          <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">POST /api/webhooks/deliver</code>.
        </p>
      </section>

      {/* Rate limiting */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Rate Limiting</h2>
        <p className="text-zinc-400 mb-3 leading-relaxed">
          Webhook deliveries are rate-limited to one per 5 seconds per endpoint URL.
          High-frequency price events are batched before dispatch to avoid overwhelming
          receivers. Signal events are never batched — each signal triggers an individual delivery.
        </p>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 font-mono text-xs text-zinc-400 leading-loose">
          <p><span className="text-zinc-500">Max delivery rate:</span> 1 per 5 seconds per URL</p>
          <p><span className="text-zinc-500">Signal events:</span> Immediate, never batched</p>
          <p><span className="text-zinc-500">Price events:</span> Batched into 5s windows</p>
          <p><span className="text-zinc-500">Max webhooks per instance:</span> 20</p>
        </div>
      </section>

      {/* Python receiver */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Python Flask Receiver</h2>
        <CodeBlock
          language="python"
          filename="webhook_receiver.py"
          code={`import hashlib
import hmac
import os
from flask import Flask, request, abort

app = Flask(__name__)
WEBHOOK_SECRET = os.environ['WEBHOOK_SECRET']

def verify_signature(secret: str, body: bytes, signature: str) -> bool:
    expected = 'sha256=' + hmac.new(
        secret.encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

@app.route('/webhooks/tradeclaw', methods=['POST'])
def receive_webhook():
    sig = request.headers.get('X-TradeClaw-Signature', '')
    if not verify_signature(WEBHOOK_SECRET, request.data, sig):
        abort(401)

    event = request.get_json()
    event_type = event.get('type')

    if event_type == 'signal.created':
        data = event['data']
        print(f"New signal: {data['symbol']} {data['direction']} @ {data['confidence']}%")
    elif event_type == 'price.alert':
        print(f"Alert triggered: {event['data']}")

    return '', 200

if __name__ == '__main__':
    app.run(port=3001)`}
        />
      </section>

      <PageNav prev={prev} next={next} githubPath="apps/web/app/docs/webhooks/page.tsx" />
    </article>
  );
}
