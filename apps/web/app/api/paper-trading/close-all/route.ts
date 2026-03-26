import { NextResponse } from 'next/server';
import { closeAllPositions } from '../../../../lib/paper-trading';

export async function POST() {
  const portfolio = closeAllPositions('manual');
  return NextResponse.json({ balance: portfolio.balance, positions: portfolio.positions });
}
