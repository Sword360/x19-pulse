# Contributing to PulseOps

Thank you for your interest in contributing to **PulseOps (x19-pulse)**! We welcome contributions from developers, DevOps engineers, and system administrators.

---

## 1. Development Setup

### Repository Structure
```
x19-pulse/
├── agent/        # Python & Go Linux monitoring daemons
├── dashboard/    # Next.js 15 Web Dashboard
├── server/       # Express.js & Socket.IO Gateway Server
├── docs/         # Enterprise documentation suite
└── package.json  # Monorepo root configuration
```

### Prerequisites
- Node.js (v18.0.0+)
- Python (v3.8+)
- Go (v1.20+) *(Optional, for Go agent compilation)*
- Git

### Quick Setup Steps
1. **Fork and Clone**:
   ```bash
   git clone https://github.com/Sword360/x19-pulse.git
   cd x19-pulse
   ```
2. **Setup Gateway Server**:
   ```bash
   cd server/
   npm install
   node index.js
   ```
3. **Setup Web Dashboard**:
   ```bash
   cd dashboard/
   npm install
   npx prisma generate
   npm run dev
   ```
4. **Run Local Agent**:
   ```bash
   ./start-agent.sh
   ```

---

## 2. Development Guidelines

### Code Style & Quality Standards
- **TypeScript & React**: Follow standard React 19 functional component guidelines. Ensure clean typing without unnecessary `any` overrides where possible.
- **Python**: Maintain PEP 8 compliance for `agent/pulseops-agent.py`. Avoid external non-standard library dependencies so the agent remains zero-install capable.
- **Go**: Format code using `gofmt` for `agent/main.go`.

### Commit Conventions
Write clear, imperative commit messages:
- `feat: add process search filtering to dashboard`
- `fix: resolve cwd tracking in WebShell execution handler`
- `docs: update API endpoints documentation`

---

## 3. Submitting Pull Requests

1. Create a feature branch off `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes and commit them.
3. Push to your branch:
   ```bash
   git push origin feature/your-feature-name
   ```
4. Open a Pull Request on GitHub with a detailed description of the changes and testing performed.
