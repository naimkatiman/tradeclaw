export async function GET() {
  return new Response('Market commentary feed unavailable: no traceable source is configured.\n', {
    status: 503,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
