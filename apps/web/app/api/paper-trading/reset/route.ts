import { NextResponse } from 'next/server';
import { resetPortfolio } from '../../../../lib/paper-trading';

export async function POST() {
  const portfolio = resetPortfolio();
  return NextResponse.json(portfolio);
}
