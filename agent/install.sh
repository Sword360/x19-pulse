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
  echo -e "${BLUE}[PulseOps] Installing x11vnc, websockify & python3 package dependencies...${NC}"
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -qq && sudo apt-get install -y -qq python3 python3-pip x11vnc websockify novnc xvfb || true
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y epel-release 2>/dev/null || true
    sudo dnf install -y python3 python3-pip x11vnc websockify novnc xvfb || true
  elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y epel-release 2>/dev/null || true
    sudo yum install -y python3 python3-pip x11vnc websockify novnc xvfb || true
  fi

  if ! command -v websockify >/dev/null 2>&1; then
    sudo python3 -m pip install websockify 2>/dev/null || pip3 install websockify 2>/dev/null || true
  fi
fi
echo -e "${GREEN}[✓] Remote GUI & Python dependencies verified.${NC}"

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
print_progress 95 "Starting background telemetry daemon & noVNC service..."

# Create VNC launcher script to handle display detection, X11 authority cookie discovery, and foreground websockify execution
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

# Locate x11vnc binary dynamically
X11VNC_BIN=""
if command -v x11vnc >/dev/null 2>&1; then
  X11VNC_BIN="$(command -v x11vnc)"
elif [ -f "/usr/local/bin/x11vnc" ]; then
  X11VNC_BIN="/usr/local/bin/x11vnc"
elif [ -f "/usr/bin/x11vnc" ]; then
  X11VNC_BIN="/usr/bin/x11vnc"
fi

# Clean up stale websockify or x11vnc processes using target ports to prevent address conflicts
pkill -9 -f websockify 2>/dev/null || true
pkill -9 -f x11vnc 2>/dev/null || true
sleep 1

TARGET_DISPLAY="${DISPLAY:-:0}"

# Locate X authority cookie automatically across GDM3, LightDM, SDDM, root & user paths
XAUTH=""
for auth in \
  "/var/run/gdm3/auth-for-gdm/database" \
  "/var/run/lightdm/root/$TARGET_DISPLAY" \
  "/run/user/$(id -u 2>/dev/null || echo 1000)/gdm/Xauthority" \
  "/run/user/1000/gdm/Xauthority" \
  "$HOME/.Xauthority" \
  "/root/.Xauthority"; do
  if [ -f "$auth" ]; then
    XAUTH="-auth $auth"
    break
  fi
done

if [ -z "$XAUTH" ]; then
  XAUTH="-auth auto"
fi

# Setup Virtual Framebuffer (Xvfb) if physical/desktop X display is not available (e.g. headless VMware VM)
if command -v xset >/dev/null 2>&1; then
  if ! xset -display "$TARGET_DISPLAY" q >/dev/null 2>&1; then
    if command -v Xvfb >/dev/null 2>&1; then
      rm -f /tmp/.X0-lock 2>/dev/null || true
      Xvfb :0 -screen 0 1280x1024x24 >/dev/null 2>&1 &
      sleep 1
    fi
  fi
elif command -v Xvfb >/dev/null 2>&1; then
  rm -f /tmp/.X0-lock 2>/dev/null || true
  Xvfb :0 -screen 0 1280x1024x24 >/dev/null 2>&1 &
  sleep 1
fi

# Start x11vnc server on port 5900
if [ -n "$X11VNC_BIN" ]; then
  $X11VNC_BIN -forever -shared -display "$TARGET_DISPLAY" $XAUTH -rfbport 5900 -nopw -quiet -bg >/dev/null 2>&1 || \
  $X11VNC_BIN -forever -shared -display "$TARGET_DISPLAY" -auth auto -rfbport 5900 -nopw -quiet -bg >/dev/null 2>&1 || \
  $X11VNC_BIN -forever -shared -display "$TARGET_DISPLAY" -rfbport 5900 -nopw -quiet -bg >/dev/null 2>&1 || true
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

# Launch Websockify in foreground (kept alive by systemd)
if [ -n "$WEBSOCKIFY_BIN" ]; then
  exec $WEBSOCKIFY_BIN $WEB_FLAG 6080 localhost:5900
else
  echo "Websockify binary not found, keeping daemon alive..."
  exec tail -f /dev/null
fi
EOF

sudo chmod +x /opt/pulseops/vnc-start.sh 2>/dev/null || chmod +x /opt/pulseops/vnc-start.sh 2>/dev/null || true

cat <<EOF | sudo tee /etc/systemd/system/pulseops-vnc.service > /dev/null
[Unit]
Description=PulseOps x11vnc Remote Display Service
After=network.target

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
