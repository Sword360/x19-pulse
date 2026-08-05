# PulseOps Realtime Gateway & WebSocket Server

The **PulseOps Realtime Gateway** (`server/index.js`) is an Express and Socket.IO application that relays telemetry metrics and command execution between Linux agents and Web Dashboard clients.

---

## Quickstart

```bash
# Install dependencies
npm install

# Run Gateway Server (Port 3001)
node index.js
```

## Health Endpoint

`GET http://localhost:3001/`

```json
{
  "name": "PulseOps Realtime Gateway & WebSocket Server",
  "status": "online",
  "endpoints": {
    "metrics": "POST /api/agent/metrics",
    "servers": "GET /api/servers",
    "history": "GET /api/servers/:hostname/history"
  }
}
```

For complete server setup, environment options, and WebShell sandbox specifications, refer to [`docs/SERVER_GATEWAY.md`](../docs/SERVER_GATEWAY.md).
