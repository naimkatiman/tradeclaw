import { NextResponse } from 'next/server';
import { resetPortfolio } from '../../../../lib/paper-trading';

export async function POST() {
<<<<<<< HEAD
  const portfolio = resetPortfolio();
  return NextResponse.json(portfolio);
=======
  try {
    const portfolio = resetPortfolio();
    return NextResponse.json(portfolio);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
>>>>>>> origin/main
}
