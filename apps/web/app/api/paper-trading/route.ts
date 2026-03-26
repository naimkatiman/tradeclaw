import { NextResponse } from 'next/server';
import { getPortfolio } from '../../../lib/paper-trading';

export async function GET() {
  const portfolio = getPortfolio();
  return NextResponse.json(portfolio);
}
