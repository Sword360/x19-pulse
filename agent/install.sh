#!/bin/bash
# PulseOps Linux Agent Installer
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
echo "   PulseOps Linux System Agent - Auto Installer      "
echo "======================================================"
echo "Target Dashboard: $SERVER_URL"
echo "Host Name:        $(hostname)"
echo "------------------------------------------------------"

# Prepare directories
mkdir -p /tmp/pulseops /tmp/pulseops_opt 2>/dev/null || true

# Generate agent configuration
echo "[1/4] Writing agent configuration..."
mkdir -p /etc/pulseops 2>/dev/null || sudo mkdir -p /etc/pulseops 2>/dev/null || true
CONFIG_JSON="{\"server_url\": \"${SERVER_URL}\", \"agent_token\": \"${AGENT_TOKEN}\"}"

if [ -w /etc/pulseops ]; then
  echo "$CONFIG_JSON" > /etc/pulseops/agent.json
else
  echo "$CONFIG_JSON" | sudo tee /etc/pulseops/agent.json > /dev/null
fi

# Download agent script from GitHub
echo "[2/4] Fetching agent script from GitHub repository..."
curl -fsSL "https://raw.githubusercontent.com/Sword360/x19-pulse/main/agent/pulseops-agent.py" -o /tmp/pulseops-agent.py

mkdir -p /opt/pulseops 2>/dev/null || sudo mkdir -p /opt/pulseops 2>/dev/null || true
if [ -w /opt/pulseops ]; then
  cp /tmp/pulseops-agent.py /opt/pulseops/agent.py
  chmod +x /opt/pulseops/agent.py
else
  sudo cp /tmp/pulseops-agent.py /opt/pulseops/agent.py
  sudo chmod +x /opt/pulseops/agent.py
fi

# Start agent daemon process
echo "[3/4] Launching PulseOps agent daemon..."
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
  echo "[4/4] Systemd background service active!"
else
  echo "[3/4] Launching agent in background daemon process..."
  PULSEOPS_SERVER="${SERVER_URL}" PULSEOPS_TOKEN="${AGENT_TOKEN}" python3 /opt/pulseops/agent.py > /tmp/pulseops-agent.log 2>&1 &
  echo "[4/4] Agent process running in background!"
fi

echo "======================================================"
echo "  SUCCESS! Server $(hostname) connected to PulseOps!  "
echo "======================================================"
