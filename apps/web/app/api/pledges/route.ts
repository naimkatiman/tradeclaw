import { NextRequest, NextResponse } from 'next/server';
import { getPledges, addPledge, getStats, maskEmail } from '../../../lib/pledges';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  try {
    const pledges = getPledges();
    const stats = getStats();

    // Return recent 10 pledgers with masked emails
    const recent = [...pledges]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        name: p.name,
        email: maskEmail(p.email),
        milestoneStars: p.milestoneStars,
        createdAt: p.createdAt,
      }));

    return NextResponse.json(
      { pledges: recent, stats, totalPledges: pledges.length },
      { headers: CORS_HEADERS }
    );
  } catch {
    return NextResponse.json({ error: 'Failed to load pledges' }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, milestoneStars } = body as { name?: string; email?: string; milestoneStars?: number };

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 100) {
      return NextResponse.json({ error: 'Name is required (1-100 characters)' }, { status: 400, headers: CORS_HEADERS });
    }

    // Validate email
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400, headers: CORS_HEADERS });
    }

    // Validate milestone
    const validMilestones = [100, 250, 500, 1000];
    if (!milestoneStars || !validMilestones.includes(milestoneStars)) {
      return NextResponse.json({ error: 'milestoneStars must be 100, 250, 500, or 1000' }, { status: 400, headers: CORS_HEADERS });
    }

    const pledge = addPledge(name.trim(), email.trim(), milestoneStars);

    return NextResponse.json(
      {
        success: true,
        pledge: {
          id: pledge.id,
          name: pledge.name,
          email: maskEmail(pledge.email),
          milestoneStars: pledge.milestoneStars,
          createdAt: pledge.createdAt,
        },
      },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch {
    return NextResponse.json({ error: 'Failed to save pledge' }, { status: 500, headers: CORS_HEADERS });
  }
}
