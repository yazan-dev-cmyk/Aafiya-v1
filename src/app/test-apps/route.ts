import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  url.pathname = '/ar/test-apps';
  return NextResponse.redirect(url, 307);
}
