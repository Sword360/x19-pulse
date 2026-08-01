#!/bin/bash
# PulseOps Linux Agent 1-Line GitHub Auto-Installer
set -e

SERVER_URL="$1"
AGENT_TOKEN="$2"

if [ -z "$SERVER_URL" ]; then
  SERVER_URL="https://x19-pulse.vercel.app"
fi

if [ -z "$AGENT_TOKEN" ]; then
  AGENT_TOKEN="pulse_agent_token_$(date +%s)"
fi

echo "======================================================"
echo "   PulseOps Linux System Agent - GitHub Installer    "
echo "======================================================"
echo "Target Dashboard: $SERVER_URL"
echo "Host Name:        $(hostname)"
echo "------------------------------------------------------"

# Create agent system directories
sudo mkdir -p /etc/pulseops /opt/pulseops

# Generate agent configuration
cat <<EOF | sudo tee /etc/pulseops/agent.json > /dev/null
{
  "server_url": "${SERVER_URL}",
  "agent_token": "${AGENT_TOKEN}"
}
EOF

# Download latest pulseops-agent.py directly from GitHub repository
echo "[PulseOps] Downloading agent from GitHub..."
sudo curl -sSL "https://raw.githubusercontent.com/Sword360/x19-pulse/main/agent/pulseops-agent.py" -o /opt/pulseops/agent.py
sudo chmod +x /opt/pulseops/agent.py

# Create systemd service unit
cat <<EOF | sudo tee /etc/systemd/system/pulseops-agent.service > /dev/null
[Unit]
Description=PulseOps Linux System Monitoring Daemon
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/python3 /opt/pulseops/agent.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Enable and start daemon service if systemd is available
if command -v systemctl >/dev/null 2>&1; then
  echo "[PulseOps] Registering systemd background daemon service..."
  sudo systemctl daemon-reload
  sudo systemctl enable --now pulseops-agent || true
  echo "[PulseOps] Daemon service started successfully!"
else
  echo "[PulseOps] Launching agent in background process..."
  PULSEOPS_SERVER="${SERVER_URL}" PULSEOPS_TOKEN="${AGENT_TOKEN}" python3 /opt/pulseops/agent.py > /tmp/pulseops.log 2>&1 &
  echo "[PulseOps] Agent running in background!"
fi

echo "======================================================"
echo "  SUCCESS! Server $(hostname) connected to PulseOps!  "
echo "======================================================"
