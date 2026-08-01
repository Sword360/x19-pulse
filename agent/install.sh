#!/bin/bash
# PulseOps Linux Agent & noVNC Remote GUI Auto-Installer
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
mkdir -p /tmp/pulseops /etc/pulseops /opt/pulseops 2>/dev/null || sudo mkdir -p /etc/pulseops /opt/pulseops 2>/dev/null || true

# 1. Check and Install x11vnc & websockify for Remote GUI Display
echo "[1/5] Checking x11vnc and websockify for noVNC Remote GUI..."
if ! command -v x11vnc >/dev/null 2>&1 || ! command -v websockify >/dev/null 2>&1; then
  echo "[PulseOps] Installing x11vnc & websockify package dependencies..."
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -qq && sudo apt-get install -y -qq x11vnc websockify novnc || true
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y x11vnc websockify || true
  elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y x11vnc websockify || true
  fi
else
  echo "[PulseOps] x11vnc & websockify already installed."
fi

# 2. Configure Agent credentials
echo "[2/5] Writing agent configuration..."
CONFIG_JSON="{\"server_url\": \"${SERVER_URL}\", \"agent_token\": \"${AGENT_TOKEN}\"}"

if [ -w /etc/pulseops ]; then
  echo "$CONFIG_JSON" > /etc/pulseops/agent.json
else
  echo "$CONFIG_JSON" | sudo tee /etc/pulseops/agent.json > /dev/null
fi

# 3. Download agent script from GitHub
echo "[3/5] Fetching agent script from GitHub repository..."
curl -fsSL "https://raw.githubusercontent.com/Sword360/x19-pulse/main/agent/pulseops-agent.py" -o /tmp/pulseops-agent.py

if [ -w /opt/pulseops ]; then
  cp /tmp/pulseops-agent.py /opt/pulseops/agent.py
  chmod +x /opt/pulseops/agent.py
else
  sudo cp /tmp/pulseops-agent.py /opt/pulseops/agent.py
  sudo chmod +x /opt/pulseops/agent.py
fi

# 4. Configure x11vnc and websockify services
echo "[4/5] Setting up noVNC WebSocket Display Tunnel (Port 6080)..."
if command -v x11vnc >/dev/null 2>&1 && command -v websockify >/dev/null 2>&1; then
  # Create x11vnc systemd service
  cat <<EOF | sudo tee /etc/systemd/system/pulseops-vnc.service > /dev/null
[Unit]
Description=PulseOps x11vnc Remote Display Service
After=multi-user.target

[Service]
Type=simple
ExecStart=/usr/bin/x11vnc -forever -shared -bg -display :0 -rfbport 5900 -nopw
ExecStartPost=/usr/bin/websockify --web=/usr/share/novnc 6080 localhost:5900
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
  if command -v systemctl >/dev/null 2>&1 && systemctl status >/dev/null 2>&1; then
    sudo systemctl daemon-reload || true
    sudo systemctl enable --now pulseops-vnc || true
  fi
fi

# 5. Start agent daemon process
echo "[5/5] Launching PulseOps agent daemon..."
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
  echo "Systemd background service active!"
else
  PULSEOPS_SERVER="${SERVER_URL}" PULSEOPS_TOKEN="${AGENT_TOKEN}" python3 /opt/pulseops/agent.py > /tmp/pulseops-agent.log 2>&1 &
  echo "Agent process running in background!"
fi

echo "======================================================"
echo "  SUCCESS! Server $(hostname) connected to PulseOps!  "
echo "  noVNC GUI Display Stream Available on Port 6080     "
echo "======================================================"
