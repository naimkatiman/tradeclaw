jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn(),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}));

import { promises as fs } from 'fs';
import { getActiveSubscribers } from '../email-subscribers';
import { getActiveSmsSubscribers } from '../sms-subscribers';
import { getAllExpoTokens } from '../expo-push-tokens';
import { getAllSubscriptions } from '../push-subscriptions';

const mockedReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

describe('delivery recipient stores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns no recipients when the backing file is missing', async () => {
    mockedReadFile.mockRejectedValue(new Error('ENOENT'));

    await expect(getActiveSubscribers()).resolves.toEqual([]);
    await expect(getActiveSmsSubscribers()).resolves.toEqual([]);
    await expect(getAllExpoTokens()).resolves.toEqual([]);
    await expect(getAllSubscriptions()).resolves.toEqual([]);
  });

  it('keeps an explicitly empty recipient file empty', async () => {
    mockedReadFile.mockResolvedValue('[]' as never);

    await expect(getActiveSubscribers()).resolves.toEqual([]);
    await expect(getActiveSmsSubscribers()).resolves.toEqual([]);
    await expect(getAllExpoTokens()).resolves.toEqual([]);
    await expect(getAllSubscriptions()).resolves.toEqual([]);
  });
});
