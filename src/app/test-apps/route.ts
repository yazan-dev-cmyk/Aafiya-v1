import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'aafiya.site';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  return NextResponse.redirect(`${proto}://${host}/ar/test-apps`, 307);
}

