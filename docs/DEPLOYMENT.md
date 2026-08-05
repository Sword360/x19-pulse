# PulseOps Production Deployment Guide

This guide provides step-by-step instructions for deploying **PulseOps (x19-pulse)** in production environments.

---

## 1. Architecture Infrastructure Requirements

| Component | Recommended Hosting Platform | Specs / Environment |
| :--- | :--- | :--- |
| **Web Dashboard** | Vercel / Render / Netlify | Node.js 18+, Next.js 15 App Router |
| **Database** | Supabase / AWS RDS / Managed PostgreSQL | PostgreSQL 14+ |
| **Realtime Gateway** | Linux VM / AWS EC2 / DigitalOcean Droplet | Node.js 18+, Port 3001 exposed |
| **Agent Daemons** | Monitored Linux Hosts | Linux (Ubuntu, Debian, RHEL, CentOS), Systemd |

---

## 2. Database Deployment (Supabase / PostgreSQL)

1. Provision a PostgreSQL instance on Supabase.
2. Obtain the transaction pooler connection string:
   `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
3. Configure `dashboard/.env`:
   ```env
   DATABASE_URL="postgresql://..."
   ```
4. Push Prisma schema:
   ```bash
   cd dashboard/
   npx prisma generate
   npx prisma db push
   ```

---

## 3. Web Dashboard Deployment (Vercel)

The repository root includes a custom `package.json` with build scripts optimized for Vercel monorepo builds:

```json
"scripts": {
  "build": "cd dashboard && npx prisma generate --schema=prisma/schema.prisma && npm run build",
  "vercel-build": "cd dashboard && npm install && npx prisma generate --schema=prisma/schema.prisma && npm run build"
}
```

### Vercel Deployment Steps:
1. Connect GitHub repository `Sword360/x19-pulse` to Vercel.
2. Set Root Directory to `./` (or `dashboard`).
3. Add Environment Variables:
   - `DATABASE_URL`: PostgreSQL connection string.
   - `NEXT_PUBLIC_API_URL`: Realtime Gateway Server public URL (e.g. `https://gateway.yourdomain.com`).
4. Deploy project.

---

## 4. Realtime Gateway Server Deployment (Linux VM)

Deploy the Express / Socket.IO server on a dedicated VM or container:

```bash
# Clone repository
git clone https://github.com/Sword360/x19-pulse.git
cd x19-pulse/server

# Install dependencies
npm install

# Setup Systemd Service for Gateway Server
sudo cat <<EOF > /etc/systemd/system/pulseops-gateway.service
[Unit]
Description=PulseOps Realtime Gateway Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/x19-pulse/server
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=5
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
EOF

# Enable & Start Service
sudo systemctl daemon-reload
sudo systemctl enable pulseops-gateway
sudo systemctl start pulseops-gateway
```

### Nginx Reverse Proxy Setup (HTTPS / WSS)
```nginx
server {
    server_name gateway.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 5. Linux Node Agent Onboarding

Run the automated installer on each target node to connect it to the central dashboard and gateway:

```bash
curl -fsSL https://raw.githubusercontent.com/Sword360/x19-pulse/main/agent/install.sh | sudo bash -s -- "https://gateway.yourdomain.com" "YOUR_PRODUCTION_AGENT_TOKEN"
```
