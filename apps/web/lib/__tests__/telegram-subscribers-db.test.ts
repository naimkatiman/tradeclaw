import {
  addSubscriber,
  removeSubscriber,
  getSubscriber,
  readSubscribers,
  updateSubscriberPairs,
  updateSubscriberConfidence,
  countSubscribers,
} from '../telegram-subscribers';
import { query } from '../db-pool';

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb('telegram-subscribers — DB CRUD', () => {
  const chatA = `test-chat-a-${Date.now()}`;
  const chatB = `test-chat-b-${Date.now()}`;

  afterAll(async () => {
    await query(
      `DELETE FROM telegram_subscribers WHERE chat_id = ANY($1::text[])`,
      [[chatA, chatB]],
    );
  });

  it('addSubscriber inserts with default pairs=all and minConfidence=70', async () => {
    const sub = await addSubscriber(chatA, { username: 'alice', firstName: 'Alice' });
    expect(sub.chatId).toBe(chatA);
    expect(sub.username).toBe('alice');
    expect(sub.subscribedPairs).toBe('all');
    expect(sub.minConfidence).toBe(70);
  });

  it('addSubscriber is idempotent — re-invite resets prefs to defaults', async () => {
    await updateSubscriberPairs(chatA, ['BTCUSD']);
    await updateSubscriberConfidence(chatA, 85);
    // Re-add — should reset to defaults
    const resub = await addSubscriber(chatA, { username: 'alice', firstName: 'Alice' });
    expect(resub.subscribedPairs).toBe('all');
    expect(resub.minConfidence).toBe(70);
  });

  it('updateSubscriberPairs swaps "all" for a symbol list', async () => {
    const updated = await updateSubscriberPairs(chatA, ['BTCUSD', 'ETHUSD']);
    expect(updated?.subscribedPairs).toEqual(['BTCUSD', 'ETHUSD']);
  });

  it('updateSubscriberConfidence clamps to 0-100', async () => {
    const low = await updateSubscriberConfidence(chatA, -10);
    expect(low?.minConfidence).toBe(0);
    const high = await updateSubscriberConfidence(chatA, 150);
    expect(high?.minConfidence).toBe(100);
  });

  it('readSubscribers returns newest-first; countSubscribers matches', async () => {
    await addSubscriber(chatB, { firstName: 'Bob' });
    const all = await readSubscribers();
    const ourChats = all.filter((s) => s.chatId === chatA || s.chatId === chatB);
    expect(ourChats.length).toBe(2);

    const count = await countSubscribers();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('removeSubscriber deletes and returns true; second call returns false', async () => {
    const first = await removeSubscriber(chatB);
    expect(first).toBe(true);
    const second = await removeSubscriber(chatB);
    expect(second).toBe(false);
    const gone = await getSubscriber(chatB);
    expect(gone).toBeNull();
  });
});
