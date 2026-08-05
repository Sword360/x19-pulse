<div align="center">

# PulseOps (x19-pulse)

### Enterprise Linux Infrastructure Monitoring, WebShell Management & Remote Desktop Streaming Platform

[![Build & Deploy](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](https://github.com/Sword360/x19-pulse)
[![Next.js](https://img.shields.io/badge/Next.js-15%20(React%2019)-000000?logo=nextdotjs)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM%20PostgreSQL-2D3748?logo=prisma)](https://www.prisma.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime%20Relay-010101?logo=socketdotio)](https://socket.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

</div>

## 📌 Executive Summary

**PulseOps** is an enterprise-grade, real-time Linux infrastructure telemetry, server administration, and remote desktop control platform. Designed for DevOps teams, system administrators, and cloud engineers, PulseOps combines low-overhead system monitoring daemons with a Next.js 15 Web Dashboard, an integrated interactive GNOME-style WebShell terminal, and live noVNC remote desktop GUI streaming.

---

## ✨ Key Platform Features

- ⚡ **Real-Time Telemetry Streaming**: Sub-second system metrics ingestion (CPU %, Memory, Disk space via `statvfs`, Load Average 1m/5m/15m, Uptime) broadcast via WebSockets.
- 📊 **Interactive Analytics**: Time-series metric history charts powered by Recharts.
- 💻 **Browser WebShell Terminal**: Execute Linux commands with persistent working directory state and log ring buffers directly within the browser.
- 🖥️ **Live Remote Desktop (noVNC)**: Stream live X11 desktop sessions (`x11vnc` + `websockify` proxy on port 6080) with full mouse/keyboard input and scale toggle modes.
- ⚙️ **Process & Syslog Inspection**: Filter and inspect top active system processes (`ps`) and system journal logs (`journalctl`).
- 🔐 **Enterprise RBAC & Security**: Tiered permission system (ADMIN, OPERATOR, VIEWER) with audit logging, bcrypt password hashing, and token-authenticated agent pushes.
- 🚀 **Dual Agent Daemon Implementations**: Zero-dependency Python 3 agent and a single static binary Go agent for ultra-lightweight deployments.

---

## 🏗️ System Architecture

```
                               ┌────────────────────────────────────────┐
                               │        PulseOps Web Dashboard          │
                               │   (Next.js 15 / Prisma / Recharts)     │
                               └───────────────────┬────────────────────┘
                                                   │
                                     REST APIs & Socket.IO WSS
                                                   │
                                                   ▼
                               ┌────────────────────────────────────────┐
                               │     Realtime Gateway & Relay Server    │
                               │        (Express.js / Socket.IO)        │
                               └───────────────────▲────────────────────┘
                                                   │
                                        Telemetry Push (JSON)
                                                   │
                        ┌──────────────────────────┴──────────────────────────┐
                        │                                                     │
              ┌─────────┴─────────┐                                 ┌─────────┴─────────┐
              │ Python 3 Daemon   │                                 │ Static Go Binary  │
              │ (/proc, systemd)  │                                 │   Agent Daemon    │
              └─────────┬─────────┘                                 └─────────┬─────────┘
                        │                                                     │
                        └──────────────────────────┬──────────────────────────┘
                                                   │
                                         Target Linux Systems
                              (syslog / x11vnc / websockify noVNC)
```

---

## 📚 Enterprise Documentation Suite

For detailed component documentation, architecture specifications, API references, and deployment guides, refer to the `docs/` directory:

| Document | Description |
| :--- | :--- |
| 🏗️ [**Architecture Guide**](docs/ARCHITECTURE.md) | High-level system architecture, telemetry data flow, sequence diagrams, and Prisma ER diagram. |
| 🔌 [**API Reference**](docs/API.md) | Complete REST API endpoints specification, payload examples, and Socket.IO WebSocket protocol specs. |
| 🤖 [**Agent Operations Guide**](docs/AGENT_GUIDE.md) | Python & Go agent setup, `install.sh` workflow, systemd service installation, and WSL configuration. |
| ⚡ [**Gateway Server Guide**](docs/SERVER_GATEWAY.md) | Express / Socket.IO Gateway configuration, in-memory ring-buffers, and WebShell bash sandbox. |
| 🖥️ [**Web Dashboard Guide**](docs/DASHBOARD_GUIDE.md) | Next.js 15 App Router setup, Prisma PostgreSQL integration, UI tab breakdown, and RBAC user permissions. |
| 🛡️ [**Security & Hardening**](docs/SECURITY.md) | Security posture, authentication tokens, command execution safety, VNC encryption, and production checklist. |
| 🚀 [**Deployment Guide**](docs/DEPLOYMENT.md) | Step-by-step production deployment for Vercel, Supabase PostgreSQL, Node.js Gateway, and Linux hosts. |
| 🤝 [**Contributing Guidelines**](docs/CONTRIBUTING.md) | Development environment setup, repository conventions, code standards, and PR submission workflow. |

---

## 🚀 Quickstart Guide

### 1. One-Line Agent Installer (Target Linux Host)
Run the automated installer script on any target Linux machine:

```bash
curl -fsSL https://raw.githubusercontent.com/Sword360/x19-pulse/main/agent/install.sh | sudo bash -s -- "https://your-gateway-url.com" "YOUR_AGENT_TOKEN"
```

### 2. Run Gateway Server Locally
```bash
cd server/
npm install
node index.js
```

### 3. Run Web Dashboard Locally
```bash
cd dashboard/
npm install
npx prisma generate
npm run dev
```

Visit `http://localhost:3000` to access the dashboard.

---

## 📂 Repository Structure

```
x19-pulse/
├── agent/                # Linux telemetry daemons & installation scripts
│   ├── install.sh        # Automated background daemon & noVNC installer
│   ├── pulseops-agent.py # Python system metrics collection daemon
│   ├── main.go           # Single static binary Go agent implementation
│   └── README.md         # Component README
├── dashboard/            # Next.js 15 Enterprise Web Application
│   ├── prisma/           # Prisma schema (PostgreSQL / Supabase models)
│   ├── src/app/          # Next.js App Router (Dashboard UI, WebShell, API routes)
│   └── README.md         # Component README
├── server/               # Realtime Gateway Server
│   ├── index.js          # Express & Socket.IO gateway relay server
│   └── README.md         # Component README
├── docs/                 # Enterprise documentation suite
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── AGENT_GUIDE.md
│   ├── SERVER_GATEWAY.md
│   ├── DASHBOARD_GUIDE.md
│   ├── SECURITY.md
│   ├── DEPLOYMENT.md
│   └── CONTRIBUTING.md
├── start-agent.sh        # WSL local launcher script
└── package.json          # Monorepo root build scripts
```

---

## 🔒 Security & Compliance

PulseOps is built with defense-in-depth principles:
- Token-authenticated agent endpoints (`Bearer`).
- Cryptographic password hashing (`bcrypt`) and audit trail logging (`AuditLog`).
- Tiered Role-Based Access Control (`ADMIN`, `OPERATOR`, `VIEWER`).
- Shell command execution sandboxing with 30-second timeouts and output buffer caps.

See the [**Security & Hardening Guide**](docs/SECURITY.md) for full compliance details.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.