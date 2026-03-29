import { NextResponse } from 'next/server';
import { getPortfolio } from '../../../lib/paper-trading';

export async function GET() {
<<<<<<< HEAD
  const portfolio = getPortfolio();
  return NextResponse.json(portfolio);
=======
  try {
    const portfolio = getPortfolio();
    return NextResponse.json(portfolio);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
>>>>>>> origin/main
}
