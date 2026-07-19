const { hasCommand, injectRequiredSecrets, replaceEnvValue } = require('./index');

describe('create-tradeclaw environment generation', () => {
  const template = [
    'DB_PASSWORD=  # required database password',
    'USER_SESSION_SECRET=                  # required session secret',
    'ADMIN_SECRET=                         # required admin secret',
    'ADMIN_EMAILS=                         # optional allowlist',
    'AUTH_SECRET=                          # required relay secret',
    '',
  ].join('\n');

  it('replaces required assignments even when the template has inline comments', () => {
    const deterministicRandomBytes = (length) => Buffer.alloc(length, length);
    const { envContent, secrets } = injectRequiredSecrets(template, deterministicRandomBytes);

    expect(secrets.DB_PASSWORD).toHaveLength(32);
    expect(secrets.USER_SESSION_SECRET).toHaveLength(64);
    expect(secrets.ADMIN_SECRET).toHaveLength(64);
    expect(secrets.AUTH_SECRET).toHaveLength(64);

    for (const [key, value] of Object.entries(secrets)) {
      expect(envContent).toContain(`${key}=${value}`);
    }
    expect(envContent).toContain('ADMIN_EMAILS=                         # optional allowlist');
    expect(envContent).not.toMatch(/^(DB_PASSWORD|USER_SESSION_SECRET|ADMIN_SECRET|AUTH_SECRET)=\s*(?:#.*)?$/m);
  });

  it('fails loudly when a required key disappears from the template', () => {
    expect(() => replaceEnvValue('DB_PASSWORD=\n', 'ADMIN_SECRET', 'secret')).toThrow(
      'Required environment variable ADMIN_SECRET is missing from .env.example',
    );
  });
});

describe('create-tradeclaw command discovery', () => {
  it('uses the native Windows command locator on Windows', () => {
    const run = jest.fn(() => ({ status: 0 }));

    expect(hasCommand('docker', 'win32', run)).toBe(true);
    expect(run).toHaveBeenCalledWith('where', ['docker'], { stdio: 'ignore' });
  });

  it('uses a positional shell argument on POSIX without interpolating the command', () => {
    const run = jest.fn(() => ({ status: 1 }));

    expect(hasCommand('missing-tool', 'linux', run)).toBe(false);
    expect(run).toHaveBeenCalledWith(
      'sh',
      ['-c', 'command -v "$1"', 'sh', 'missing-tool'],
      { stdio: 'ignore' },
    );
  });
});
