import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import os from 'os';
import fs from 'fs';

declare global {
  var _serverStore: Map<string, any> | undefined;
  var _metricsHistory: Map<string, any[]> | undefined;
  var _terminalLogs: Map<string, string[]> | undefined;
  var _removedServers: Set<string> | undefined;
  var _pendingCommands: Map<string, string> | undefined;
  var _terminalCwds: Map<string, string> | undefined;
}

if (!globalThis._serverStore) globalThis._serverStore = new Map();
if (!globalThis._metricsHistory) globalThis._metricsHistory = new Map();
if (!globalThis._terminalLogs) globalThis._terminalLogs = new Map();
if (!globalThis._removedServers) globalThis._removedServers = new Set();
if (!globalThis._pendingCommands) globalThis._pendingCommands = new Map();
if (!globalThis._terminalCwds) globalThis._terminalCwds = new Map();

const serverStore = globalThis._serverStore;
const metricsHistory = globalThis._metricsHistory;
const terminalLogs = globalThis._terminalLogs;
const removedServers = globalThis._removedServers;
const pendingCommands = globalThis._pendingCommands;
const terminalCwds = globalThis._terminalCwds;

async function executeLinuxCommand(hostname: string, command: string): Promise<string> {
  const targetHost = hostname || 'localhost';
  const cleanCmd = command.trim();

  if (!terminalCwds.has(targetHost)) {
    terminalCwds.set(targetHost, process.env.HOME || process.cwd());
  }

  if (cleanCmd === "clear") {
    terminalLogs.set(targetHost, []);
    return "";
  }

  let currentCwd = terminalCwds.get(targetHost)!;
  if (!fs.existsSync(currentCwd)) {
    currentCwd = process.env.HOME || process.cwd();
    terminalCwds.set(targetHost, currentCwd);
  }

  const username = os.userInfo().username || 'root';
  const homeDir = process.env.HOME || `/home/${username}`;
  const displayCwd = currentCwd.startsWith(homeDir)
    ? currentCwd.replace(homeDir, '~')
    : currentCwd;

  const isSudo = cleanCmd.startsWith('sudo ');
  const promptSymbol = isSudo ? '#' : '$';
  const displayUser = isSudo ? 'root' : username;
  const promptLine = `${displayUser}@${targetHost}:${displayCwd}${promptSymbol} ${cleanCmd}\n`;

  let execCmd = cleanCmd;
  const isCd = cleanCmd === "cd" || cleanCmd.startsWith("cd ") || cleanCmd.startsWith("cd;");

  if (isCd) {
    execCmd = `${cleanCmd} && pwd`;
  }

  return new Promise((resolve) => {
    exec(
      execCmd,
      {
        cwd: currentCwd,
        shell: '/bin/bash',
        maxBuffer: 1024 * 1024 * 10,
        env: { ...process.env, TERM: 'xterm-256color' },
        timeout: 30000
      },
      (error, stdout, stderr) => {
        let outputText = promptLine;

        if (isCd) {
          if (stdout && stdout.trim()) {
            const lines = stdout.trim().split('\n');
            const possibleNewCwd = lines[lines.length - 1].trim();
            if (fs.existsSync(possibleNewCwd)) {
              try {
                if (fs.statSync(possibleNewCwd).isDirectory()) {
                  terminalCwds.set(targetHost, possibleNewCwd);
                }
              } catch (e) {}
            }
            const outputLines = lines.slice(0, -1);
            if (outputLines.length > 0) {
              outputText += outputLines.join('\n') + '\n';
            }
          }
          if (stderr) {
            outputText += stderr;
            if (!stderr.endsWith('\n')) outputText += '\n';
          }
          if (error && !stderr) {
            outputText += `${error.message}\n`;
          }
        } else {
          if (stdout) {
            outputText += stdout;
            if (!stdout.endsWith('\n')) outputText += '\n';
          }
          if (stderr) {
            outputText += stderr;
            if (!stderr.endsWith('\n')) outputText += '\n';
          }
          if (error && !stdout && !stderr) {
            outputText += `${error.message}\n`;
          }
        }

        if (!terminalLogs.has(targetHost)) terminalLogs.set(targetHost, []);
        const logs = terminalLogs.get(targetHost)!;
        logs.push(outputText);
        if (logs.length > 100) logs.shift();

        resolve(outputText);
      }
    );
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, hostname, pid, command } = body;

    // Handle metrics telemetry from Agent
    if (body.hostname && body.cpu_usage !== undefined) {
      const agentId = body.hostname;

      // Auto-restore server node if it was previously removed and is now sending fresh metrics
      if (removedServers.has(agentId)) {
        removedServers.delete(agentId);
      }
      const existing = serverStore.get(agentId);
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
        vnc_active: body.vnc_active !== undefined ? body.vnc_active : (existing?.vnc_active ?? false)
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

      const pendingCmd = pendingCommands.get(agentId) || null;
      if (pendingCmd) pendingCommands.delete(agentId);

      return NextResponse.json({ status: 'success', server: serverData, command: pendingCmd });
    }

    // Handle VNC Start / Stop Commands
    if (action === 'start_vnc' || action === 'stop_vnc') {
      const isStart = action === 'start_vnc';
      const serverData = serverStore.get(hostname) || { hostname, status: 'ONLINE' };
      serverData.vnc_active = isStart;
      serverStore.set(hostname, serverData);
      pendingCommands.set(hostname, isStart ? 'start_vnc' : 'stop_vnc');

      return NextResponse.json({
        status: 'success',
        vnc_active: isStart,
        message: `VNC remote desktop service ${isStart ? 'started' : 'stopped'} successfully`
      });
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

    // Handle Terminal Command Execution (bash & real linux execution)
    if (action === 'exec_terminal') {
      const outputText = await executeLinuxCommand(hostname || 'localhost', command || '');
      const logs = terminalLogs.get(hostname || 'localhost') || [];
      return NextResponse.json({
        status: 'success',
        output: outputText,
        fullLogs: logs.join('')
      });
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
