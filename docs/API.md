# PulseOps API Reference

This document outlines all REST HTTP API endpoints and WebSocket protocol specifications implemented in **PulseOps (x19-pulse)**.

---

## 1. Authentication & Security Headers

All agent-to-gateway telemetry pushes require a Bearer token passed in the HTTP Authorization header:

```http
Authorization: Bearer <PULSEOPS_AGENT_TOKEN>
Content-Type: application/json
```

Frontend dashboard requests pass standard JSON payloads or handle session tokens.

---

## 2. Gateway Server REST Endpoints (`server/index.js`)

### Base Health Endpoint
- **URL**: `GET /`
- **Description**: Returns operational status of the Realtime Gateway Server.
- **Response**:
```json
{
  "name": "PulseOps Realtime Gateway & WebSocket Server",
  "status": "online",
  "endpoints": {
    "metrics": "POST /api/agent/metrics",
    "servers": "GET /api/servers",
    "history": "GET /api/servers/:hostname/history"
  },
  "dashboardUrl": "http://localhost:3000"
}
```

---

### Ingest Agent Metrics / WebShell Command Execution
- **URL**: `POST /api/agent/metrics`
- **Description**: Ingests incoming system metrics from Linux agents or executes terminal commands.

#### Case A: Ingest System Telemetry Payload
**Headers**:
- `Authorization`: `Bearer <PULSEOPS_AGENT_TOKEN>`

**Request Body**:
```json
{
  "hostname": "ubuntu-server-01",
  "uptime": 128450.2,
  "cpu_usage": 14.5,
  "memory": {
    "total": 17179869184,
    "used": 4294967296,
    "available": 12884901888,
    "usage_pct": 25.0
  },
  "disk": {
    "total": 107374182400,
    "used": 32212254720,
    "free": 75161927680,
    "usage_pct": 30.0
  },
  "load_avg": [0.45, 0.32, 0.18],
  "processes": [
    {
      "pid": "1042",
      "user": "root",
      "cpu": "2.1",
      "mem": "0.4",
      "command": "python3 /opt/pulseops/agent.py"
    }
  ],
  "logs": [
    "Aug 05 07:30:00 ubuntu-server-01 systemd[1]: Started PulseOps Linux Daemon."
  ],
  "vnc_active": true,
  "timestamp": 1785915000
}
```

**Response**:
```json
{
  "status": "success"
}
```

#### Case B: Execute Terminal Command (WebShell)
**Request Body**:
```json
{
  "action": "exec_terminal",
  "hostname": "ubuntu-server-01",
  "command": "uname -a"
}
```

**Response**:
```json
{
  "status": "success",
  "output": "root@ubuntu-server-01:~$ uname -a\nLinux ubuntu-server-01 5.15.0-88-generic #98-Ubuntu SMP x86_64\n",
  "fullLogs": "..."
}
```

---

### Fetch Connected Servers
- **URL**: `GET /api/servers`
- **Description**: Retrieves a list of active monitored servers currently registered with the gateway.
- **Response**:
```json
[
  {
    "hostname": "ubuntu-server-01",
    "status": "ONLINE",
    "lastSeen": "2026-08-05T07:30:00.000Z",
    "cpu": 14.5,
    "memory": 25.0,
    "disk": 30.0,
    "load": [0.45, 0.32, 0.18],
    "uptime": 128450.2,
    "vnc_active": true
  }
]
```

---

### Fetch Host Metric History
- **URL**: `GET /api/servers/:hostname/history`
- **Description**: Returns buffered telemetry history (up to 50 points) for time-series charts.
- **Response**:
```json
[
  {
    "timestamp": "07:30:00 AM",
    "cpu": 14.5,
    "memory": 25.0,
    "disk": 30.0
  }
]
```

---

## 3. Web Dashboard REST Endpoints (`dashboard/src/app/api`)

### User Database Management (`/api/db/users`)
- **GET `/api/db/users`**: List registered system users.
- **POST `/api/db/users`**: Register a new user (Requires email, name, password, role).
- **PUT `/api/db/users`**: Update user roles or credentials.
- **DELETE `/api/db/users`**: Delete a target user account (Admin required).

### Server Database Sync (`/api/db/servers`)
- **GET `/api/db/servers`**: Fetch registered server nodes from PostgreSQL database.
- **POST `/api/db/servers`**: Register or un-blacklist host in the system database.

---

## 4. WebSocket Event Specification (`Socket.IO`)

Connect to Gateway on `ws://<GATEWAY_HOST>:3001`

### Downstream Server Events (Gateway -> Web Client)

#### `initial_state`
Sent immediately upon client connection.
```json
{
  "servers": [
    {
      "hostname": "ubuntu-server-01",
      "status": "ONLINE",
      "lastSeen": "2026-08-05T07:30:00.000Z",
      "cpu": 14.5,
      "memory": 25.0,
      "disk": 30.0,
      "load": [0.45, 0.32, 0.18],
      "uptime": 128450.2,
      "vnc_active": true
    }
  ]
}
```

#### `metrics_update`
Emitted every time an agent pushes updated telemetry metrics.
```json
{
  "agentId": "ubuntu-server-01",
  "current": {
    "hostname": "ubuntu-server-01",
    "status": "ONLINE",
    "lastSeen": "2026-08-05T07:30:03.000Z",
    "cpu": 16.2,
    "memory": 25.1,
    "disk": 30.0,
    "load": [0.48, 0.33, 0.18],
    "uptime": 128453.2,
    "vnc_active": true
  },
  "history": [ ... ]
}
```
