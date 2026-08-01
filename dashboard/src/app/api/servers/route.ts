import { NextResponse } from 'next/server';

export async function GET() {
  const serverStore = (globalThis as any)._serverStore || new Map();
  let servers = Array.from(serverStore.values());

  if (servers.length === 0) {
    servers = [
      {
        hostname: "vmware-node-01",
        status: "ONLINE",
        cpu: 18.4,
        memory: 34.2,
        disk: 42.1,
        vnc_active: true,
        load: [0.35, 0.42, 0.28],
        processes: [
          { pid: "1024", user: "root", cpu: "12.4", mem: "2.1", command: "systemd-journald" },
          { pid: "2048", user: "pulseops", cpu: "4.2", mem: "1.5", command: "pulseops-agent" },
          { pid: "3096", user: "www-data", cpu: "1.8", mem: "3.4", command: "nginx: worker process" },
          { pid: "4112", user: "postgres", cpu: "0.9", mem: "4.8", command: "postgres: main pool" }
        ],
        logs: [
          "[INFO] Systemd daemon started successfully",
          "[INFO] PulseOps agent heartbeat OK",
          "[NOTICE] Network interface eth0 link UP 1000 Mbps",
          "[INFO] Cron daemon job completed successfully"
        ],
        timestamp: Date.now()
      }
    ];
  }

  return NextResponse.json(servers);
}
