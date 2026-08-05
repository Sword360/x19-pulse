# PulseOps Web Dashboard Guide

This document covers the Next.js 15 Web Dashboard (`dashboard/`), providing real-time infrastructure visualization, terminal management, and user access control.

---

## 1. Stack & Architecture

- **Framework**: Next.js 15 (App Router, React 19)
- **UI & Styling**: Vanilla CSS, TailwindCSS, Lucide React Icons
- **Data Visualization**: Recharts (`AreaChart`, `ResponsiveContainer`)
- **Database & ORM**: PostgreSQL via Prisma ORM & Supabase Integration
- **Realtime**: Socket.IO Client / REST Polling fallback

---

## 2. Dashboard Features & Tab Navigation

### 1. Overview Tab
- **System Metrics**: Live gauges for CPU Usage, Memory Consumption, Disk Usage, and Load Average (1m / 5m / 15m).
- **Time-Series Area Charts**: Real-time graph visualization for server metric history.
- **Node List**: Multi-server grid showing hostname, IP address, OS, kernel, and active status (`ONLINE`, `WARNING`, `OFFLINE`).

### 2. Processes Tab
- **Process List**: Table displaying active system processes with PID, User, CPU %, Memory %, and command line executable.
- **Search Filtering**: Filter running processes by name or PID.

### 3. System Logs Tab
- **Log Stream**: Real-time browser for system journal logs (`journalctl`) and syslog messages.

### 4. Interactive WebShell Terminal Tab
- **GNOME-Style Web Terminal**: Fully functional shell interface.
- **Command History**: Navigate previous commands with Up/Down arrow keys.
- **Clear & Copy Actions**: One-click buffer clearing and output copying.

### 5. Remote Desktop (noVNC) Tab
- **Embedded VNC View**: Direct HTML canvas stream connected to target node's `websockify` proxy (port 6080).
- **Control Actions**: Start/stop VNC service, scale mode toggle, fullscreen mode.

---

## 3. Role-Based Access Control (RBAC)

The dashboard enforces role-based permission tiers:

| Role | Permissions |
| :--- | :--- |
| **ADMIN** | Full administrative rights: Add/delete servers, manage system users, execute WebShell commands, trigger VNC remote control. |
| **OPERATOR** | Operational access: View server metrics, inspect processes, view system logs, execute non-administrative terminal commands. |
| **VIEWER** | Read-only access: View metric charts and server status overview. |

---

## 4. Prisma Database Setup

### Environment Configuration (`dashboard/.env`)
```env
DATABASE_URL="postgresql://postgres:password@db.supabase.co:5432/postgres"
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### Running Prisma Commands
```bash
cd dashboard/

# Generate Prisma Client
npx prisma generate

# Apply Schema Migrations
npx prisma db push

# Open Prisma Studio GUI
npx prisma studio
```
