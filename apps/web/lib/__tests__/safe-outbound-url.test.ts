import {
  checkSafeOutboundUrl,
  isSafeOutboundUrl,
  assertSafeOutboundUrl,
} from '../safe-outbound-url';

describe('safe-outbound-url', () => {
  it.each([
    'https://discord.com/api/webhooks/123/abc',
    'https://hooks.slack.com/services/T1/B2/abc',
    'https://example.com:8443/path',
    'https://api.tradeclaw.win/v1/whatever',
  ])('accepts %s', (url) => {
    expect(isSafeOutboundUrl(url)).toBe(true);
    expect(() => assertSafeOutboundUrl(url)).not.toThrow();
  });

  it.each([
    ['http://example.com', 'protocol'],
    ['ftp://example.com/x', 'protocol'],
    ['file:///etc/passwd', 'protocol'],
    ['javascript:alert(1)', 'protocol'],
    ['data:text/html,<script>', 'protocol'],
  ])('rejects non-HTTPS %s', (url, expectedReason) => {
    const err = checkSafeOutboundUrl(url);
    expect(err?.reason).toBe(expectedReason);
  });

  it.each([
    'https://localhost/',
    'https://127.0.0.1/',
    'https://10.0.0.5/',
    'https://172.16.0.1/',
    'https://172.31.255.255/',
    'https://192.168.1.1/',
    'https://169.254.169.254/latest/meta-data/', // AWS IMDS
    'https://0.0.0.0/',
    'https://metadata.google.internal/computeMetadata/v1/',
    'https://metadata.azure.com/instance',
    'https://service.local/x',
    'https://kube-api.internal/',
    'https://[::1]/',
    'https://[fe80::1]/',
    'https://[fc00::1]/',
  ])('rejects internal target %s', (url) => {
    expect(isSafeOutboundUrl(url)).toBe(false);
  });

  it('rejects unparseable input', () => {
    const err = checkSafeOutboundUrl('not a url');
    expect(err?.reason).toBe('parse');
  });

  it('assertSafeOutboundUrl throws with reason in message', () => {
    expect(() => assertSafeOutboundUrl('http://example.com')).toThrow(/unsafe_outbound_url:protocol/);
    expect(() => assertSafeOutboundUrl('https://10.0.0.1')).toThrow(/unsafe_outbound_url:ip_private/);
  });
});
