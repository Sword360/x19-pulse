import { NextResponse } from 'next/server';

// Global cache for warm Vercel serverless function instances
declare global {
  var _serverStore: Map<string, any> | undefined;
  var _metricsHistory: Map<string, any[]> | undefined;
}

if (!globalThis._serverStore) {
  globalThis._serverStore = new Map();
}
if (!globalThis._metricsHistory) {
  globalThis._metricsHistory = new Map();
}

const serverStore = globalThis._serverStore;
const metricsHistory = globalThis._metricsHistory;

export async function POST(request: Request) {
  try {
    const metrics = await request.json();

    if (!metrics || !metrics.hostname) {
      return NextResponse.json({ error: 'Invalid metrics payload' }, { status: 400 });
    }

    const agentId = metrics.hostname;
    const serverData = {
      hostname: metrics.hostname,
      status: 'ONLINE',
      lastSeen: new Date().toISOString(),
      cpu: metrics.cpu_usage || 0,
      memory: metrics.memory?.usage_pct || 0,
      disk: metrics.disk?.usage_pct || 0,
      load: metrics.load_avg || [0, 0, 0],
      uptime: metrics.uptime || 0
    };

    serverStore.set(agentId, serverData);

    if (!metricsHistory.has(agentId)) {
      metricsHistory.set(agentId, []);
    }

    const history = metricsHistory.get(agentId)!;
    history.push({
      timestamp: new Date().toLocaleTimeString(),
      cpu: metrics.cpu_usage || 0,
      memory: metrics.memory?.usage_pct || 0,
      disk: metrics.disk?.usage_pct || 0
    });

    if (history.length > 50) history.shift();

    return NextResponse.json({ status: 'success', server: serverData });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process metrics' }, { status: 500 });
  }
}

export async function GET() {
  const servers = Array.from(serverStore.values());
  return NextResponse.json(servers);
}
