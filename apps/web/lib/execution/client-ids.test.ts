import { buildClientIds, MAX_CLIENT_ORDER_ID_LEN } from './client-ids';

describe('buildClientIds', () => {
  const UUID_36 = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'; // 36 chars

  test('every id is ≤ Binance max length', () => {
    const ids = buildClientIds(UUID_36);
    for (const id of [ids.entry, ids.sl, ids.tp1, ids.slBe]) {
      expect(id.length).toBeLessThanOrEqual(MAX_CLIENT_ORDER_ID_LEN);
    }
  });

  test('all four ids are unique within a single signal', () => {
    const ids = buildClientIds(UUID_36);
    const set = new Set([ids.entry, ids.sl, ids.tp1, ids.slBe]);
    expect(set.size).toBe(4);
  });

  test('different signal ids produce different bases', () => {
    const a = buildClientIds(UUID_36);
    const b = buildClientIds('11111111-2222-3333-4444-555555555555');
    expect(a.base).not.toBe(b.base);
    expect(a.entry).not.toBe(b.entry);
    expect(a.sl).not.toBe(b.sl);
  });

  test('strips hyphens so base fits within 28 chars of hex', () => {
    const ids = buildClientIds(UUID_36);
    expect(ids.base).toBe('aaaaaaaabbbbccccddddeeeeeeee');
    expect(ids.base.length).toBe(28);
    expect(ids.base).not.toContain('-');
  });

  test('non-UUID input still produces unique non-colliding ids', () => {
    const ids = buildClientIds('short');
    expect(ids.entry).toBe('short-e');
    expect(ids.sl).toBe('short-sl');
    expect(ids.tp1).toBe('short-tp1');
    expect(ids.slBe).toBe('short-slbe');
    const set = new Set([ids.entry, ids.sl, ids.tp1, ids.slBe]);
    expect(set.size).toBe(4);
  });

  test('regression: 36-char UUID does NOT collide entry vs sl after 36-char clip', () => {
    // Old code did: entry = sig.id (36 chars); sl = `${sig.id}-sl`.slice(0,36) === sig.id.
    // The new helper must keep all four distinct.
    const ids = buildClientIds(UUID_36);
    expect(ids.entry).not.toBe(ids.sl);
    expect(ids.entry).not.toBe(ids.tp1);
    expect(ids.entry).not.toBe(ids.slBe);
    expect(ids.sl).not.toBe(ids.slBe);
  });
});
