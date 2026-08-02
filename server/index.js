const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Root health check endpoint
app.get('/', (req, res) => {
  res.json({
    name: "PulseOps Realtime Gateway & WebSocket Server",
    status: "online",
    endpoints: {
      metrics: "POST /api/agent/metrics",
      servers: "GET /api/servers",
      history: "GET /api/servers/:hostname/history"
    },
    dashboardUrl: "http://localhost:3000"
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory store for connected agents and metrics
const connectedAgents = new Map();
const metricsHistory = new Map();

const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');

const terminalLogs = new Map();
const terminalCwds = new Map();

function executeLinuxCommand(hostname, command) {
  return new Promise((resolve) => {
    const targetHost = hostname || 'localhost';
    const cleanCmd = (command || '').trim();

    if (!terminalCwds.has(targetHost)) {
      terminalCwds.set(targetHost, process.env.HOME || process.cwd());
    }

    if (cleanCmd === "clear") {
      terminalLogs.set(targetHost, []);
      return resolve({ output: '', fullLogs: '' });
    }

    let currentCwd = terminalCwds.get(targetHost);
    if (!fs.existsSync(currentCwd)) {
      currentCwd = process.env.HOME || process.cwd();
      terminalCwds.set(targetHost, currentCwd);
    }

    const username = os.userInfo().username || 'root';
    const homeDir = process.env.HOME || `/home/${username}`;
    const displayCwd = currentCwd.startsWith(homeDir)
      ? currentCwd.replace(homeDir, '~')
      : currentCwd;

    const isSudo = cleanCmd.startsWith('sudo ');
    const promptSymbol = isSudo ? '#' : '$';
    const displayUser = isSudo ? 'root' : username;
    const promptLine = `${displayUser}@${targetHost}:${displayCwd}${promptSymbol} ${cleanCmd}\n`;

    let execCmd = cleanCmd;
    const isCd = cleanCmd === "cd" || cleanCmd.startsWith("cd ") || cleanCmd.startsWith("cd;");

    if (isCd) {
      execCmd = `${cleanCmd} && pwd`;
    }

    exec(
      execCmd,
      {
        cwd: currentCwd,
        shell: '/bin/bash',
        maxBuffer: 1024 * 1024 * 10,
        env: { ...process.env, TERM: 'xterm-256color' },
        timeout: 30000
      },
      (error, stdout, stderr) => {
        let outputText = promptLine;

        if (isCd) {
          if (stdout && stdout.trim()) {
            const lines = stdout.trim().split('\n');
            const possibleNewCwd = lines[lines.length - 1].trim();
            if (fs.existsSync(possibleNewCwd)) {
              try {
                if (fs.statSync(possibleNewCwd).isDirectory()) {
                  terminalCwds.set(targetHost, possibleNewCwd);
                }
              } catch (e) {}
            }
            const outputLines = lines.slice(0, -1);
            if (outputLines.length > 0) {
              outputText += outputLines.join('\n') + '\n';
            }
          }
          if (stderr) {
            outputText += stderr;
            if (!stderr.endsWith('\n')) outputText += '\n';
          }
          if (error && !stderr) {
            outputText += `${error.message}\n`;
          }
        } else {
          if (stdout) {
            outputText += stdout;
            if (!stdout.endsWith('\n')) outputText += '\n';
          }
          if (stderr) {
            outputText += stderr;
            if (!stderr.endsWith('\n')) outputText += '\n';
          }
          if (error && !stdout && !stderr) {
            outputText += `${error.message}\n`;
          }
        }

        if (!terminalLogs.has(targetHost)) terminalLogs.set(targetHost, []);
        const logs = terminalLogs.get(targetHost);
        logs.push(outputText);
        if (logs.length > 100) logs.shift();

        resolve({ output: outputText, fullLogs: logs.join('') });
      }
    );
  });
}

// HTTP endpoint for agent metrics HTTP fallback / simple agent pushes & dashboard actions
app.post('/api/agent/metrics', async (req, res) => {
  const body = req.body;

  if (body && body.action === 'exec_terminal') {
    const result = await executeLinuxCommand(body.hostname, body.command);
    return res.json({ status: 'success', output: result.output, fullLogs: result.fullLogs });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  const metrics = req.body;

  if (!metrics || !metrics.hostname) {
    return res.status(400).json({ error: "Invalid metrics payload" });
  }

  const agentId = metrics.hostname;
  connectedAgents.set(agentId, {
    hostname: metrics.hostname,
    status: "ONLINE",
    lastSeen: new Date().toISOString(),
    cpu: metrics.cpu_usage,
    memory: metrics.memory?.usage_pct || 0,
    disk: metrics.disk?.usage_pct || 0,
    load: metrics.load_avg || [0, 0, 0],
    uptime: metrics.uptime || 0,
    vnc_active: metrics.vnc_active !== undefined ? metrics.vnc_active : false
  });

  if (!metricsHistory.has(agentId)) {
    metricsHistory.set(agentId, []);
  }

  const history = metricsHistory.get(agentId);
  history.push({
    timestamp: new Date().toLocaleTimeString(),
    cpu: metrics.cpu_usage,
    memory: metrics.memory?.usage_pct || 0,
    disk: metrics.disk?.usage_pct || 0
  });

  if (history.length > 50) history.shift();

  // Broadcast metrics update to connected Web Dashboard clients
  io.emit('metrics_update', {
    agentId,
    current: connectedAgents.get(agentId),
    history
  });

  res.status(200).json({ status: "success" });
});

// HTTP endpoint for frontend dashboard polling/fetching
app.get('/api/servers', (req, res) => {
  const servers = Array.from(connectedAgents.values());
  res.json(servers);
});

app.get('/api/servers/:hostname/history', (req, res) => {
  const history = metricsHistory.get(req.params.hostname) || [];
  res.json(history);
});

// Realtime WebSocket handler
io.on('connection', (socket) => {
  console.log(`[WebSocket] Client connected: ${socket.id}`);

  socket.emit('initial_state', {
    servers: Array.from(connectedAgents.values())
  });

  socket.on('disconnect', () => {
    console.log(`[WebSocket] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[PulseOps Realtime Server] Listening on port ${PORT}`);
});
