# PulseOps Web Dashboard

The **PulseOps Web Dashboard** is built with Next.js 15 (React 19), TailwindCSS, Recharts, and Prisma ORM with PostgreSQL / Supabase integration.

---

## Features

- **Live Telemetry Dashboard**: Real-time gauges and time-series charts for CPU, RAM, Disk, and Load Average.
- **Process Browser**: View and search active server processes.
- **System Journal Viewer**: Inspect live system logs (`journalctl`).
- **Interactive WebShell**: Execute Linux commands in a browser terminal.
- **Remote Desktop Stream**: Integrated noVNC viewer for live remote desktop management.
- **RBAC User Control**: Manage users with Admin, Operator, and Viewer role permissions.

---

## Development Setup

```bash
# Install dependencies
npm install

# Generate Prisma Client & Sync Database
npx prisma generate
npx prisma db push

# Start Next.js Development Server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

For detailed dashboard configuration, Prisma database management, and RBAC rules, refer to [`docs/DASHBOARD_GUIDE.md`](../docs/DASHBOARD_GUIDE.md).
