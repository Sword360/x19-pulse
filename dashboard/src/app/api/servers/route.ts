import { NextResponse } from 'next/server';

export async function GET() {
  const serverStore = (globalThis as any)._serverStore || new Map();
  const removedServers = (globalThis as any)._removedServers || new Set();

  const servers = Array.from(serverStore.values()).filter(
    (s: any) => !removedServers.has(s.hostname)
  );

  return NextResponse.json(servers);
}
