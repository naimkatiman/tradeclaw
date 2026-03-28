import { NextResponse } from 'next/server';
import { closeAllPositions } from '../../../../lib/paper-trading';

export async function POST() {
  try {
    const portfolio = closeAllPositions('manual');
    return NextResponse.json({ balance: portfolio.balance, positions: portfolio.positions });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
