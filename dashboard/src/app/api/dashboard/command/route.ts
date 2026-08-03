import { NextResponse } from 'next/server';

declare global {
  var _serverStore: Map<string, any> | undefined;
  var _pendingCommands: Map<string, string> | undefined;
}

if (!globalThis._serverStore) globalThis._serverStore = new Map();
if (!globalThis._pendingCommands) globalThis._pendingCommands = new Map();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { hostname, action, command, pid } = body;

    if (!hostname) {
      return NextResponse.json({ error: 'Hostname is required' }, { status: 400 });
    }

    const serverStore = globalThis._serverStore!;
    const pendingCommands = globalThis._pendingCommands!;
    const serverData = serverStore.get(hostname) || { hostname, status: 'ONLINE', vnc_active: false };

    let dispatchedCmd = command;

    if (action === 'start_vnc') {
      dispatchedCmd = 'start_vnc';
      serverData.vnc_active = true;
    } else if (action === 'stop_vnc') {
      dispatchedCmd = 'stop_vnc';
      serverData.vnc_active = false;
    } else if (action === 'restart_vnc') {
      dispatchedCmd = 'restart_vnc';
    } else if (action === 'kill_process' && pid) {
      dispatchedCmd = `kill_process:${pid}`;
      if (serverData.processes) {
        serverData.processes = serverData.processes.filter((p: any) => String(p.pid) !== String(pid));
      }
    }

    if (dispatchedCmd) {
      pendingCommands.set(hostname, dispatchedCmd);
      serverStore.set(hostname, serverData);
    }

    return NextResponse.json({
      status: 'success',
      hostname,
      command: dispatchedCmd,
      message: `Command '${dispatchedCmd}' queued for agent heartbeat dispatch`
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process command' }, { status: 500 });
  }
}
