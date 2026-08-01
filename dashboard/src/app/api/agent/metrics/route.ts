import { NextResponse } from 'next/server';

declare global {
  var _serverStore: Map<string, any> | undefined;
  var _metricsHistory: Map<string, any[]> | undefined;
  var _terminalLogs: Map<string, string[]> | undefined;
}

if (!globalThis._serverStore) globalThis._serverStore = new Map();
if (!globalThis._metricsHistory) globalThis._metricsHistory = new Map();
if (!globalThis._terminalLogs) globalThis._terminalLogs = new Map();

const serverStore = globalThis._serverStore;
const metricsHistory = globalThis._metricsHistory;
const terminalLogs = globalThis._terminalLogs;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, hostname, pid, command } = body;

    // Handle metrics telemetry from Agent
    if (body.hostname && body.cpu_usage !== undefined) {
      const agentId = body.hostname;
      const serverData = {
        hostname: body.hostname,
        status: 'ONLINE',
        lastSeen: new Date().toISOString(),
        cpu: body.cpu_usage || 0,
        memory: body.memory?.usage_pct || 0,
        disk: body.disk?.usage_pct || 0,
        load: body.load_avg || [0, 0, 0],
        uptime: body.uptime || 0,
        processes: body.processes || [],
        logs: body.logs || [],
        vnc_active: body.vnc_active || true
      };

      serverStore.set(agentId, serverData);

      if (!metricsHistory.has(agentId)) metricsHistory.set(agentId, []);
      const history = metricsHistory.get(agentId)!;
      history.push({
        timestamp: new Date().toLocaleTimeString(),
        cpu: body.cpu_usage || 0,
        memory: body.memory?.usage_pct || 0,
        disk: body.disk?.usage_pct || 0
      });
      if (history.length > 50) history.shift();

      return NextResponse.json({ status: 'success', server: serverData });
    }

    // Handle Process Kill / Restart Commands
    if (action === 'kill_process' || action === 'restart_process') {
      const serverData = serverStore.get(hostname);
      if (serverData && serverData.processes) {
        serverData.processes = serverData.processes.filter((p: any) => p.pid !== String(pid));
        serverStore.set(hostname, serverData);
      }
      return NextResponse.json({ status: 'success', message: `Process ${pid} ${action} command dispatched` });
    }

    // Handle Terminal Command Execution
    if (action === 'exec_terminal') {
      if (!terminalLogs.has(hostname)) terminalLogs.set(hostname, []);
      const logs = terminalLogs.get(hostname)!;
      const timestamp = new Date().toLocaleTimeString();
      
      let mockOutput = `[${timestamp}] $ ${command}\n`;
      if (command.trim() === "clear") {
        terminalLogs.set(hostname, []);
        return NextResponse.json({ status: 'success', output: '' });
      } else if (command.startsWith("kill")) {
        mockOutput += `[Process Signal] SIGTERM sent to process.\n`;
      } else if (command.startsWith("ls")) {
        mockOutput += `bin  etc  home  opt  root  sys  usr  var  pulseops-agent.py\n`;
      } else if (command.startsWith("uptime")) {
        mockOutput += ` 17:35:00 up 4 days, 2:14, 1 user, load average: 0.14, 0.08, 0.05\n`;
      } else if (command.startsWith("whoami")) {
        mockOutput += `root\n`;
      } else {
        mockOutput += `Executed command: ${command}\nReturn code: 0 (SUCCESS)\n`;
      }

      logs.push(mockOutput);
      if (logs.length > 100) logs.shift();
      return NextResponse.json({ status: 'success', output: logs.join('') });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  const servers = Array.from(serverStore.values());
  return NextResponse.json(servers);
}
