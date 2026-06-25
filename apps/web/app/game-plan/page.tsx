import type { Metadata } from 'next';
import GamePlanClient from './game-plan-client';

export const metadata: Metadata = {
  title: 'Pre-Market Game Plan — TradeClaw',
  description: 'Plan your trading day with watchlist, bias, and key levels.',
};

export const dynamic = 'force-dynamic';

export default function GamePlanPage() {
  return <GamePlanClient />;
}
