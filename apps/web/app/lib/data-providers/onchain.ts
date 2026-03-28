/**
 * On-Chain Data Provider — Mempool.space (Bitcoin)
 * https://mempool.space/api/ — no key, self-hostable
 */

import { type OnChainData, safeFetch } from './types';

// ─── Mempool.space ─────────────────────────────────────────────────────────

interface MempoolFees {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

interface MempoolStats {
  count: number;
  vsize: number;
  total_fee: number;
}

interface MempoolBlock {
  height: number;
  timestamp: number;
  difficulty: number;
}

export async function fetchMempoolData(): Promise<OnChainData | null> {
  const [fees, mempool, blocks] = await Promise.allSettled([
    safeFetch<MempoolFees>('https://mempool.space/api/v1/fees/recommended'),
    safeFetch<MempoolStats>('https://mempool.space/api/mempool'),
    safeFetch<MempoolBlock[]>('https://mempool.space/api/v1/blocks'),
  ]);

  const feeData =
    fees.status === 'fulfilled' ? fees.value : null;
  const mempoolData =
    mempool.status === 'fulfilled' ? mempool.value : null;
  const blockData =
    blocks.status === 'fulfilled' ? blocks.value : null;

  if (!feeData && !mempoolData && !blockData) return null;

  return {
    mempoolSize: mempoolData?.count ?? 0,
    feeEstimate: {
      fast: feeData?.fastestFee ?? 0,
      medium: feeData?.halfHourFee ?? 0,
      slow: feeData?.hourFee ?? 0,
    },
    blockHeight: blockData?.[0]?.height ?? 0,
    difficulty: blockData?.[0]?.difficulty,
    timestamp: Date.now(),
    source: 'mempool.space',
  };
}

// ─── Address lookup ───────────────────────────────────────────────────────

export interface AddressInfo {
  address: string;
  balance: number; // satoshis
  txCount: number;
  funded: number;
  spent: number;
}

export async function fetchAddressInfo(
  address: string,
): Promise<AddressInfo | null> {
  const data = await safeFetch<{
    address: string;
    chain_stats: {
      funded_txo_sum: number;
      spent_txo_sum: number;
      tx_count: number;
    };
    mempool_stats: {
      funded_txo_sum: number;
      spent_txo_sum: number;
      tx_count: number;
    };
  }>(`https://mempool.space/api/address/${address}`);
  if (!data) return null;

  const funded =
    data.chain_stats.funded_txo_sum + data.mempool_stats.funded_txo_sum;
  const spent =
    data.chain_stats.spent_txo_sum + data.mempool_stats.spent_txo_sum;

  return {
    address: data.address,
    balance: funded - spent,
    txCount:
      data.chain_stats.tx_count + data.mempool_stats.tx_count,
    funded,
    spent,
  };
}

// ─── Block fee statistics ─────────────────────────────────────────────────

export async function fetchBlockFeeHistory(
  blocks: number = 10,
): Promise<Array<{ height: number; avgFee: number; txCount: number }>> {
  const data = await safeFetch<
    Array<{
      height: number;
      tx_count: number;
      extras: { avgFee: number };
    }>
  >(`https://mempool.space/api/v1/blocks`);
  if (!data) return [];

  return data.slice(0, blocks).map((b) => ({
    height: b.height,
    avgFee: b.extras?.avgFee ?? 0,
    txCount: b.tx_count,
  }));
}
