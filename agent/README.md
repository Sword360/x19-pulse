# PulseOps Linux Agent Daemon

The **PulseOps Agent** is a lightweight system monitoring and management daemon for Linux operating systems.

---

## Capabilities

- **Kernel & Proc Telemetry**: Samples `/proc/stat`, `/proc/meminfo`, `/proc/loadavg`, and `statvfs` directly without overhead.
- **Process Inspection**: Monitors top active system processes sorted by CPU percentage (`ps`).
- **System Logs**: Streams system journal logs (`journalctl`) and syslog messages.
- **Remote Desktop Support**: Provisions `x11vnc` and `websockify` (noVNC proxy) running on port `6080`.
- **Implementations**: Available in Python 3 (`pulseops-agent.py`) and single static binary Go (`main.go`).

---

## One-Line Auto Installer

```bash
curl -fsSL https://raw.githubusercontent.com/Sword360/x19-pulse/main/agent/install.sh | sudo bash -s -- "https://your-gateway-server.com" "YOUR_AGENT_TOKEN"
```

For detailed agent operations, systemd service management, and Go static binary build instructions, refer to [`docs/AGENT_GUIDE.md`](../docs/AGENT_GUIDE.md).
