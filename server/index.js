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

// HTTP endpoint for agent metrics HTTP fallback / simple agent pushes
app.post('/api/agent/metrics', (req, res) => {
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
    uptime: metrics.uptime || 0
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
