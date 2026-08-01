#!/bin/bash
# PulseOps Linux Agent & noVNC Remote GUI Auto-Installer with Realtime Progress Bar
set -e

SERVER_URL="$1"
AGENT_TOKEN="$2"

if [ -z "$SERVER_URL" ]; then
  SERVER_URL="https://x19-pulse.vercel.app"
fi

if [ -z "$AGENT_TOKEN" ]; then
  AGENT_TOKEN="pulse_agent_token_$(date +%s)"
fi

GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_progress() {
  local pct=$1
  local step_desc=$2
  local filled=$((pct / 5))
  local empty=$((20 - filled))
  local bar=""
  for ((i=0; i<filled; i++)); do bar="${bar}█"; done
  for ((i=0; i<empty; i++)); do bar="${bar}░"; done
  printf "\r${CYAN}[%3d%%]${NC} ${BOLD}[${bar}]${NC} ${step_desc}\n" "$pct"
}

echo -e "${BLUE}======================================================${NC}"
echo -e "${BOLD}   PulseOps Linux System Agent - Auto Installer      ${NC}"
echo -e "${BLUE}======================================================${NC}"
echo -e "Target Dashboard : ${CYAN}${SERVER_URL}${NC}"
echo -e "Host Name        : ${CYAN}$(hostname)${NC}"
echo -e "OS Distribution  : ${CYAN}$(uname -s) $(uname -m)${NC}"
echo -e "------------------------------------------------------"

# Step 1: Initialize System Directories (10%)
print_progress 10 "Initializing PulseOps system directories..."
mkdir -p /tmp/pulseops /etc/pulseops /opt/pulseops 2>/dev/null || sudo mkdir -p /etc/pulseops /opt/pulseops 2>/dev/null || true
echo -e "${GREEN}[✓] System directories created successfully.${NC}"

# Step 2: Check & Install x11vnc & websockify (35%)
print_progress 35 "Checking x11vnc and websockify for noVNC Remote GUI..."
if ! command -v x11vnc >/dev/null 2>&1 || ! command -v websockify >/dev/null 2>&1; then
  echo -e "${BLUE}[PulseOps] Installing x11vnc & websockify package dependencies...${NC}"
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -qq && sudo apt-get install -y -qq x11vnc websockify novnc || true
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y x11vnc websockify || true
  elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y x11vnc websockify || true
  fi
fi
echo -e "${GREEN}[✓] Remote GUI dependencies verified.${NC}"

# Step 3: Write Agent Configuration & Token (60%)
print_progress 60 "Generating agent security configuration..."
CONFIG_JSON="{\"server_url\": \"${SERVER_URL}\", \"agent_token\": \"${AGENT_TOKEN}\"}"
if [ -w /etc/pulseops ]; then
  echo "$CONFIG_JSON" > /etc/pulseops/agent.json
else
  echo "$CONFIG_JSON" | sudo tee /etc/pulseops/agent.json > /dev/null
fi
echo -e "${GREEN}[✓] Credentials saved to /etc/pulseops/agent.json.${NC}"

# Step 4: Download Agent Code from GitHub (80%)
print_progress 80 "Fetching latest telemetry script from GitHub..."
curl -fsSL "https://raw.githubusercontent.com/Sword360/x19-pulse/main/agent/pulseops-agent.py" -o /tmp/pulseops-agent.py

if [ -w /opt/pulseops ]; then
  cp /tmp/pulseops-agent.py /opt/pulseops/agent.py
  chmod +x /opt/pulseops/agent.py
else
  sudo cp /tmp/pulseops-agent.py /opt/pulseops/agent.py
  sudo chmod +x /opt/pulseops/agent.py
fi
echo -e "${GREEN}[✓] Telemetry script installed to /opt/pulseops/agent.py.${NC}"

# Step 5: Configure & Launch Background Systemd Services (100%)
print_progress 95 "Starting background telemetry daemon & noVNC service..."

if command -v x11vnc >/dev/null 2>&1 && command -v websockify >/dev/null 2>&1; then
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
else
  PULSEOPS_SERVER="${SERVER_URL}" PULSEOPS_TOKEN="${AGENT_TOKEN}" python3 /opt/pulseops/agent.py > /tmp/pulseops-agent.log 2>&1 &
fi

print_progress 100 "PulseOps Agent installation completed!"

echo -e "${BLUE}======================================================${NC}"
echo -e "${GREEN}${BOLD}   [SUCCESS] Server $(hostname) Connected to PulseOps! ${NC}"
echo -e "   Dashboard URL : ${CYAN}${SERVER_URL}${NC}"
echo -e "   noVNC Stream  : ${CYAN}Port 6080${NC}"
echo -e "${BLUE}======================================================${NC}"
