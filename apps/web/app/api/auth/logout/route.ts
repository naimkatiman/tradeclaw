import { NextResponse } from 'next/server';

const COOKIE_NAME = 'tc_admin';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // expires immediately
  });
  return response;
}
