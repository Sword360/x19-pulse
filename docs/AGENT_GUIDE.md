# PulseOps Agent Deployment & Operations Guide

This guide covers the deployment, configuration, and troubleshooting of the **PulseOps Linux Monitoring Agent**.

---

## 1. Overview & Capabilities

The PulseOps agent runs as a daemon on target Linux nodes to collect system performance telemetry and facilitate remote control:

- **Resource Telemetry**: CPU percentage, memory utilization, disk space via `statvfs`, system load average (1m/5m/15m), and host uptime.
- **Process Monitoring**: Top active processes sorted by CPU consumption via `ps`.
- **Log Streaming**: System journal logs via `journalctl -n 30` or `/var/log/syslog`.
- **Remote Desktop Support**: Automated provisioning of `x11vnc` and `websockify` (noVNC proxy) running on port `6080`.
- **Dual Implementations**: Available in lightweight Python 3 (`pulseops-agent.py`) and single static binary Go (`main.go`).

---

## 2. Automated One-Line Installation

Execute the automated installer on any Linux machine (Ubuntu, Debian, RHEL, CentOS, Fedora, Alpine):

```bash
curl -fsSL https://raw.githubusercontent.com/Sword360/x19-pulse/main/agent/install.sh | sudo bash -s -- "https://your-dashboard-domain.com" "YOUR_AGENT_TOKEN"
```

### What `install.sh` Performs:
1. **Directories**: Creates `/etc/pulseops` and `/opt/pulseops`.
2. **Dependencies**: Installs `x11vnc`, `websockify`, `novnc`, and `python3`.
3. **Configuration**: Generates `/etc/pulseops/agent.json` and configures default VNC password authentication (`Sword@09`).
4. **Daemon Deployment**: Registers and enables systemd background services:
   - `pulseops-agent.service` (Telemetry Daemon)
   - `pulseops-vnc.service` (x11vnc + noVNC WebSockets proxy on port 6080)

---

## 3. Python Agent (`pulseops-agent.py`)

### Configuration File (`/etc/pulseops/agent.json`)
```json
{
  "server_url": "https://x19-pulse.vercel.app",
  "agent_token": "your-secret-agent-token"
}
```

### Environment Overrides
- `PULSEOPS_SERVER`: Gateway URL (Default: `http://localhost:3000`)
- `PULSEOPS_TOKEN`: Bearer secret token (Default: `default-secret-token`)

### Running Manually / Debugging
```bash
python3 /opt/pulseops/agent.py
```

---

## 4. High-Performance Go Agent (`main.go`)

For systems requiring high performance or zero runtime dependencies:

### Build Static Binary
```bash
cd agent/
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o pulseops-agent main.go
```

### Run Go Agent Daemon
```bash
PULSEOPS_SERVER="https://your-dashboard.com" PULSEOPS_TOKEN="your-token" ./pulseops-agent
```

---

## 5. Systemd Service Management

Check service status, restart daemons, or view logs:

```bash
# Telemetry Agent Status
sudo systemctl status pulseops-agent.service

# Remote Desktop (x11vnc / noVNC) Status
sudo systemctl status pulseops-vnc.service

# Restart Services
sudo systemctl restart pulseops-agent
sudo systemctl restart pulseops-vnc

# View Telemetry Agent Logs
sudo journalctl -u pulseops-agent.service -f --no-pager
```

---

## 6. WSL (Windows Subsystem for Linux) Setup

To launch the PulseOps agent under WSL:

```bash
chmod +x start-agent.sh
./start-agent.sh
```

Ensure `PULSEOPS_SERVER` is set to point to your central PulseOps Gateway Server IP.
