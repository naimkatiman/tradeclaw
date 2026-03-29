import { NextResponse } from 'next/server';
import { resetMetrics } from '@/lib/performance-metrics';

export async function POST() {
<<<<<<< HEAD
  resetMetrics();
  return NextResponse.json({ success: true, message: 'Metrics reset successfully' });
=======
  try {
    resetMetrics();
    return NextResponse.json({ success: true, message: 'Metrics reset successfully' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
>>>>>>> origin/main
}
