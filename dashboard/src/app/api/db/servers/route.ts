import { NextResponse } from 'next/server';

declare global {
  var _serverStore: Map<string, any> | undefined;
  var _metricsHistory: Map<string, any[]> | undefined;
  var _removedServers: Set<string> | undefined;
}

if (!globalThis._serverStore) globalThis._serverStore = new Map();
if (!globalThis._metricsHistory) globalThis._metricsHistory = new Map();
if (!globalThis._removedServers) globalThis._removedServers = new Set();

// DELETE: Remove a registered agent server node from database (Admin permission required)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hostname = searchParams.get('hostname');
    const requesterRole = searchParams.get('requesterRole');

    if (requesterRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Permission denied: Only Admin users can remove server nodes from the database' }, { status: 403 });
    }

    if (!hostname) {
      return NextResponse.json({ error: 'Hostname is required' }, { status: 400 });
    }

    const serverStore = globalThis._serverStore;
    const metricsHistory = globalThis._metricsHistory;
    const removedServers = globalThis._removedServers;

    // Permanently unregister server node and add to removed blacklist
    if (serverStore && serverStore.has(hostname)) {
      serverStore.delete(hostname);
    }
    if (metricsHistory && metricsHistory.has(hostname)) {
      metricsHistory.delete(hostname);
    }
    if (removedServers) {
      removedServers.add(hostname);
    }

    return NextResponse.json({ status: 'success', message: `Server node ${hostname} removed from database` });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to remove server node' }, { status: 500 });
  }
}

// POST: Add or unblacklist a server node in database
export async function POST(request: Request) {
  try {
    const { hostname, ipAddress } = await request.json();
    if (!hostname) {
      return NextResponse.json({ error: 'Hostname is required' }, { status: 400 });
    }

    const serverStore = globalThis._serverStore || new Map();
    const removedServers = globalThis._removedServers || new Set();

    if (removedServers) {
      removedServers.delete(hostname);
    }

    const serverData = {
      hostname: hostname,
      ipAddress: ipAddress || '127.0.0.1',
      status: 'ONLINE',
      lastSeen: new Date().toISOString(),
      cpu: 0,
      memory: 0,
      disk: 0,
      load: [0, 0, 0],
      uptime: 0,
      processes: [],
      logs: [],
      vnc_active: true
    };

    serverStore.set(hostname, serverData);

    return NextResponse.json({ status: 'success', server: serverData });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update server' }, { status: 500 });
  }
}
