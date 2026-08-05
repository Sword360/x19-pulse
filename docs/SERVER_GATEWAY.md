# PulseOps Realtime Gateway Server Guide

This guide details the setup, configuration, and execution of the **PulseOps Realtime Gateway & WebSocket Relay Server** (`server/index.js`).

---

## 1. Role in the Platform Architecture

The Realtime Gateway Server acts as the core communication broker between monitored Linux nodes and connected Web Dashboards:

1. **Ingests Telemetry**: Receives metric payloads sent by Python or Go agent daemons.
2. **Maintains In-Memory Caches**: Keeps active host state (`connectedAgents`) and a rolling window of metric history (`metricsHistory`).
3. **Broadcasting**: Real-time Socket.IO events sent to active web clients.
4. **WebShell Execution Engine**: Relays commands from the Web Dashboard to `/bin/bash` with directory state persistence.

---

## 2. Configuration & Environment Variables

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3001` | HTTP and WebSocket server listening port. |
| `PULSEOPS_SERVER` | `http://localhost:3000` | Target URL returned in health check endpoint. |

---

## 3. Installation & Local Development

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### Setup Steps
```bash
cd server/

# Install dependencies
npm install

# Run server in development mode
node index.js
```

Upon successful initialization, you will see:
```
[PulseOps Realtime Server] Listening on port 3001
```

---

## 4. WebShell Sandbox & Execution Mechanism

The gateway implements bash command execution (`executeLinuxCommand` function):

- **Shell Context**: Runs commands in `/bin/bash` with max output buffer of 10MB (`1024 * 1024 * 10`).
- **Working Directory (`cwd`) Tracking**: Tracks `cd` commands per host and updates current working directory context dynamically.
- **Log Ring-Buffer**: Retains terminal log output up to 100 entries per target host.
- **Environment Isolation**: Executes with `TERM=xterm-256color` and user context resolution (`root` vs standard username).
