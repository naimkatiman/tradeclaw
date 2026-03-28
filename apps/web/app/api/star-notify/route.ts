import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DATA_PATH = path.join(process.cwd(), 'data', 'star-notify.json');

async function readEmails(): Promise<string[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

async function writeEmails(emails: string[]): Promise<void> {
  await fs.writeFile(DATA_PATH, JSON.stringify(emails, null, 2), 'utf-8');
}

export async function GET() {
  const emails = await readEmails();
  return NextResponse.json({ count: emails.length });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const emails = await readEmails();

    if (emails.includes(email)) {
      return NextResponse.json({ message: 'Already subscribed', count: emails.length });
    }

    emails.push(email);
    await writeEmails(emails);

    return NextResponse.json({ message: 'Subscribed successfully', count: emails.length });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
