# Enterprise Security Posture & Hardening Guide

This document defines the security architecture, threat model, and hardening recommendations for **PulseOps (x19-pulse)** in enterprise environments.

---

## 1. Security Architecture Matrix

```
┌──────────────────┐            Bearer Token            ┌──────────────────┐
│   Agent Daemon   ├───────────────────────────────────►│  Gateway Server  │
└──────────────────┘          (HTTPS / TLS 1.3)         └────────┬─────────┘
                                                                 │
                                                                 │  RBAC & Sessions
                                                                 ▼
                                                        ┌──────────────────┐
                                                        │  Web Dashboard   │
                                                        └──────────────────┘
```

---

## 2. Authentication & Authorization

### Agent Telemetry Authentication
- All incoming metrics payloads sent to `/api/agent/metrics` must include a valid Bearer token matching `PULSEOPS_TOKEN`.
- Requests without valid authorization headers receive HTTP 401/403 responses and are rejected.

### Dashboard Role-Based Access Control (RBAC)
- **Password Protection**: Passwords stored as cryptographically hashed digests (`passwordHash`).
- **User Roles**: Enforced through `Role` enum (`ADMIN`, `OPERATOR`, `VIEWER`).
- **Audit Logging**: Sensitive administrative actions (adding servers, changing roles, user deletion) are logged to the `AuditLog` table in PostgreSQL.

---

## 3. WebShell Sandboxing & Terminal Execution Safety

- **Execution Timeout**: Commands executed via the Gateway's WebShell timeout after 30 seconds (`timeout: 30000`) to prevent infinite lockups.
- **Max Output Buffer**: Standard output and error buffers are capped at 10MB (`maxBuffer: 1024 * 1024 * 10`) to mitigate Denial of Service (DoS) memory exhaustion attacks.
- **Least-Privilege Execution**: The gateway daemon should run under a dedicated system user (e.g., `pulseops`) rather than `root` unless root operations are explicitly required.

---

## 4. Remote Desktop (noVNC / x11vnc) Security

- **RFB Password Authentication**: `x11vnc` services require password authentication (`/etc/x11vnc.pass`).
- **WebSockets Transport Encryption (WSS)**: In production environments, reverse proxy proxies (Nginx / Caddy / Cloudflare) must terminate TLS/SSL and encrypt port 6080 traffic via WSS (`wss://`).
- **Port Isolation**: Restrict direct inbound access to port 5900 (VNC) using `iptables` or cloud security groups; expose only `websockify` over port 6080 or reverse proxy.

---

## 5. Security Hardening Checklist

- [ ] Change default agent tokens (`PULSEOPS_TOKEN`) in production `/etc/pulseops/agent.json`.
- [ ] Update default VNC authentication password (`Sword@09`) in `install.sh`.
- [ ] Enforce HTTPS/WSS across all dashboard endpoints and Gateway communication paths.
- [ ] Restrict access to database connection strings (`DATABASE_URL`) via environment secrets.
- [ ] Run agent processes using systemd sandbox directives (`ProtectSystem=full`, `PrivateTmp=true`).
