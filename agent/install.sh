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
mkdir -p /tmp/pulseops /etc/pulseops /opt/pulseops 2>/dev/null || sudo mkdir -p /etc/pulseops /opt/pulseops

# Generate agent configuration
echo "[1/4] Configuring Agent token..."
CONFIG_CONTENT="{\"server_url\": \"${SERVER_URL}\", \"agent_token\": \"${AGENT_TOKEN}\"}"
if [ -w /etc/pulseops ]; then
  echo "$CONFIG_CONTENT" > /etc/pulseops/agent.json
else
  echo "$CONFIG_CONTENT" | sudo tee /etc/pulseops/agent.json > /dev/null
fi

# Download agent script from GitHub
echo "[2/4] Downloading agent script from GitHub..."
curl -fsSL "https://raw.githubusercontent.com/Sword360/x19-pulse/main/agent/pulseops-agent.py" -o /tmp/pulseops-agent.py
if [ -w /opt/pulseops ]; then
  cp /tmp/pulseops-agent.py /opt/pulseops/agent.py
  chmod +x /opt/pulseops/agent.py
else
  sudo cp /tmp/pulseops-agent.py /opt/pulseops/agent.py
  sudo chmod +x /opt/pulseops/agent.py
fi

# Register daemon service
echo "[3/4] Registering background daemon..."
if command -v systemctl >/dev/null 2>&1 && systemctl status >/dev/null 2>&1; then
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
  sudo systemctl daemon-reload
  sudo systemctl enable --now pulseops-agent || true
  echo "[4/4] Systemd daemon service started!"
else
  echo "[3/4] Non-systemd / WSL environment detected. Running background process..."
  PULSEOPS_SERVER="${SERVER_URL}" PULSEOPS_TOKEN="${AGENT_TOKEN}" python3 /opt/pulseops/agent.py > /tmp/pulseops-agent.log 2>&1 &
  echo "[4/4] Agent process running in background!"
fi

echo "======================================================"
echo "  SUCCESS! Server $(hostname) connected to PulseOps!  "
echo "======================================================"
