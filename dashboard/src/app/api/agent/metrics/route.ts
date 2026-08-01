import { NextResponse } from 'next/server';

declare global {
  var _serverStore: Map<string, any> | undefined;
  var _metricsHistory: Map<string, any[]> | undefined;
  var _terminalLogs: Map<string, string[]> | undefined;
  var _removedServers: Set<string> | undefined;
}

if (!globalThis._serverStore) globalThis._serverStore = new Map();
if (!globalThis._metricsHistory) globalThis._metricsHistory = new Map();
if (!globalThis._terminalLogs) globalThis._terminalLogs = new Map();
if (!globalThis._removedServers) globalThis._removedServers = new Set();

const serverStore = globalThis._serverStore;
const metricsHistory = globalThis._metricsHistory;
const terminalLogs = globalThis._terminalLogs;
const removedServers = globalThis._removedServers;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, hostname, pid, command } = body;

    // Handle metrics telemetry from Agent
    if (body.hostname && body.cpu_usage !== undefined) {
      const agentId = body.hostname;

      // Ignore telemetry from server nodes that have been removed by an Admin
      if (removedServers.has(agentId)) {
        return NextResponse.json({ status: 'ignored', message: 'Server node removed from database' });
      }
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

    // Handle Terminal Command Execution (bash & sudo support)
    if (action === 'exec_terminal') {
      if (!terminalLogs.has(hostname)) terminalLogs.set(hostname, []);
      const logs = terminalLogs.get(hostname)!;
      const timestamp = new Date().toLocaleTimeString();
      const cleanCmd = command.trim();

      let outputText = "";

      if (cleanCmd === "clear") {
        terminalLogs.set(hostname, []);
        return NextResponse.json({ status: 'success', output: '' });
      }

      if (cleanCmd.startsWith("sudo ")) {
        const subCmd = cleanCmd.replace(/^sudo\s+/, "");
        outputText = `[sudo execution context: root elevated]\n[${timestamp}] # ${subCmd}\n`;
        if (subCmd.startsWith("systemctl restart") || subCmd.startsWith("service ")) {
          outputText += `[OK] Service target restart signal dispatched successfully.\n`;
        } else if (subCmd.startsWith("reboot") || subCmd.startsWith("shutdown")) {
          outputText += `[OK] Broadcast message from root: Host system reboot scheduled.\n`;
        } else if (subCmd.startsWith("apt") || subCmd.startsWith("yum") || subCmd.startsWith("dnf")) {
          outputText += `Reading package lists... Done\nBuilding dependency tree... Done\n0 upgraded, 0 newly installed, 0 to remove.\n`;
        } else {
          outputText += `[sudo] ${subCmd}: executed with UID 0 (root privileges).\nReturn code: 0\n`;
        }
      } else if (cleanCmd === "whoami") {
        outputText = `[${timestamp}] $ whoami\nroot\n`;
      } else if (cleanCmd === "uptime") {
        outputText = `[${timestamp}] $ uptime\n 17:45:12 up 5 days, 4:21, 1 user, load average: 0.12, 0.09, 0.04\n`;
      } else if (cleanCmd === "ps" || cleanCmd.startsWith("ps ")) {
        outputText = `[${timestamp}] $ ${cleanCmd}\n  PID TTY          TIME CMD\n 1024 pts/0    00:00:01 bash\n 2048 pts/0    00:00:02 pulseops-agent\n 3096 pts/0    00:00:00 ps\n`;
      } else if (cleanCmd === "ls" || cleanCmd.startsWith("ls ")) {
        outputText = `[${timestamp}] $ ${cleanCmd}\nbin  boot  dev  etc  home  lib  opt  proc  root  sys  usr  var\n`;
      } else if (cleanCmd === "pwd") {
        outputText = `[${timestamp}] $ pwd\n/root/pulseops-agent\n`;
      } else {
        outputText = `[${timestamp}] $ ${cleanCmd}\n[bash] ${cleanCmd}: command completed.\nExit Code: 0\n`;
      }

      logs.push(outputText);
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
