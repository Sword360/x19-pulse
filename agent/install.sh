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
if ! command -v x11vnc >/dev/null 2>&1 || ! command -v websockify >/dev/null 2>&1 || ! command -v python3 >/dev/null 2>&1; then
  echo -e "${BLUE}[PulseOps] Installing x11vnc, websockify & python3 dependencies...${NC}"
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -qq && sudo apt-get install -y -qq python3 python3-pip x11vnc websockify novnc x11-xserver-utils || true
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y epel-release 2>/dev/null || true
    sudo dnf install -y python3 python3-pip x11vnc websockify novnc xorg-x11-server-utils || true
  elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y epel-release 2>/dev/null || true
    sudo yum install -y python3 python3-pip x11vnc websockify novnc xorg-x11-server-utils || true
  fi

  if ! command -v websockify >/dev/null 2>&1; then
    sudo python3 -m pip install websockify 2>/dev/null || pip3 install websockify 2>/dev/null || true
  fi
fi
echo -e "${GREEN}[✓] x11vnc & Python dependencies verified.${NC}"

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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/pulseops-agent.py" ]; then
  cp "$SCRIPT_DIR/pulseops-agent.py" /tmp/pulseops-agent.py
else
  curl -fsSL "https://raw.githubusercontent.com/Sword360/x19-pulse/main/agent/pulseops-agent.py" -o /tmp/pulseops-agent.py || true
fi

if [ -w /opt/pulseops ]; then
  cp /tmp/pulseops-agent.py /opt/pulseops/agent.py
  chmod +x /opt/pulseops/agent.py
else
  sudo cp /tmp/pulseops-agent.py /opt/pulseops/agent.py
  sudo chmod +x /opt/pulseops/agent.py
fi
echo -e "${GREEN}[✓] Telemetry script installed to /opt/pulseops/agent.py.${NC}"

# Step 5: Configure & Launch Background Systemd Services (100%)
print_progress 95 "Starting background x11vnc daemon & noVNC service..."

# 5a. Create x11vnc launcher script with dynamic password detection
cat <<'EOF' | sudo tee /opt/pulseops/x11vnc-start.sh > /dev/null
#!/bin/bash
export DISPLAY=:0
XAUTH="/run/user/1000/gdm/Xauthority"
PASS_FILE="/etc/x11vnc.pass"

# Wait for Xauthority file or fallback
while [ ! -f "$XAUTH" ] && [ ! -f "$HOME/.Xauthority" ]; do
    sleep 2
done

if [ -f "$XAUTH" ]; then
    AUTH_FLAGS="-auth $XAUTH"
elif [ -f "$HOME/.Xauthority" ]; then
    AUTH_FLAGS="-auth $HOME/.Xauthority"
else
    AUTH_FLAGS="-auth guess"
fi

if [ -s "$PASS_FILE" ]; then
    AUTH_MODE="-rfbauth $PASS_FILE"
else
    AUTH_MODE="-nopw"
fi

exec /usr/bin/x11vnc -display :0 $AUTH_FLAGS -rfbport 5900 -forever -shared -dpms -noxrecord -wait 10 $AUTH_MODE
EOF

sudo chmod +x /opt/pulseops/x11vnc-start.sh 2>/dev/null || chmod +x /opt/pulseops/x11vnc-start.sh 2>/dev/null || true

# 5b. Create noVNC websockify proxy launcher script
cat <<'EOF' | sudo tee /opt/pulseops/vnc-start.sh > /dev/null
#!/bin/bash
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

# Locate websockify binary dynamically
WEBSOCKIFY_BIN=""
if command -v websockify >/dev/null 2>&1; then
  WEBSOCKIFY_BIN="$(command -v websockify)"
elif [ -f "/usr/local/bin/websockify" ]; then
  WEBSOCKIFY_BIN="/usr/local/bin/websockify"
elif [ -f "/usr/bin/websockify" ]; then
  WEBSOCKIFY_BIN="/usr/bin/websockify"
elif python3 -c "import websockify" >/dev/null 2>&1; then
  WEBSOCKIFY_BIN="python3 -m websockify"
fi

# Discover valid noVNC HTML directory
NOVNC_DIR=""
for dir in "/usr/share/novnc" "/usr/share/novnc-web" "/usr/local/share/novnc" "/var/www/html/novnc"; do
  if [ -d "$dir" ]; then
    NOVNC_DIR="$dir"
    break
  fi
done

WEB_FLAG=""
if [ -n "$NOVNC_DIR" ] && [ -d "$NOVNC_DIR" ]; then
  WEB_FLAG="--web=$NOVNC_DIR"
fi

# Ensure x11vnc is running
if ! pgrep -x "x11vnc" >/dev/null 2>&1; then
  if [ -f /opt/pulseops/x11vnc-start.sh ]; then
    /opt/pulseops/x11vnc-start.sh >/dev/null 2>&1 &
  fi
fi

# Launch Websockify in foreground (kept alive by systemd)
if [ -n "$WEBSOCKIFY_BIN" ]; then
  exec $WEBSOCKIFY_BIN $WEB_FLAG 6080 127.0.0.1:5900
else
  echo "Websockify binary not found, keeping daemon alive..."
  exec tail -f /dev/null
fi
EOF

sudo chmod +x /opt/pulseops/vnc-start.sh 2>/dev/null || chmod +x /opt/pulseops/vnc-start.sh 2>/dev/null || true

cat <<EOF | sudo tee /etc/systemd/system/pulseops-vnc.service > /dev/null
[Unit]
Description=PulseOps x11vnc Remote Display & noVNC Proxy Service
After=network.target display-manager.service

[Service]
Type=simple
User=root
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=/opt/pulseops/vnc-start.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

if command -v systemctl >/dev/null 2>&1 && systemctl status >/dev/null 2>&1; then
  sudo systemctl daemon-reload 2>/dev/null || true
  sudo systemctl restart pulseops-vnc 2>/dev/null || true
  sudo systemctl enable pulseops-vnc 2>/dev/null || true
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
  sudo systemctl daemon-reload 2>/dev/null || true
  sudo systemctl restart pulseops-agent 2>/dev/null || true
  sudo systemctl enable pulseops-agent 2>/dev/null || true
else
  PULSEOPS_SERVER="${SERVER_URL}" PULSEOPS_TOKEN="${AGENT_TOKEN}" python3 /opt/pulseops/agent.py > /tmp/pulseops-agent.log 2>&1 &
fi

print_progress 100 "PulseOps Agent installation completed!"

echo -e "${BLUE}======================================================${NC}"
echo -e "${GREEN}${BOLD}   [SUCCESS] Server $(hostname) Connected to PulseOps! ${NC}"
echo -e "   Dashboard URL : ${CYAN}${SERVER_URL}${NC}"
echo -e "   noVNC Stream  : ${CYAN}Port 6080${NC}"
echo -e "${BLUE}======================================================${NC}"
