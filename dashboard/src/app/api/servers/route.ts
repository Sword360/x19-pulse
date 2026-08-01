import { NextResponse } from 'next/server';

export async function GET() {
  const serverStore = globalThis._serverStore || new Map();
  const servers = Array.from(serverStore.values());
  return NextResponse.json(servers);
}
