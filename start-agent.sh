#!/bin/bash
# PulseOps WSL Agent & Gateway Launcher

SERVER_URL="${PULSEOPS_SERVER:-http://localhost:3001}"
TOKEN="${PULSEOPS_TOKEN:-wsl-default-token}"

echo "================================================="
echo "  PulseOps Linux Monitoring Agent (WSL Edition)  "
echo "================================================="
echo "Target Gateway: $SERVER_URL"
echo "Host Name:     $(hostname)"
echo "-------------------------------------------------"

# Run agent loop
export PULSEOPS_SERVER="$SERVER_URL"
export PULSEOPS_TOKEN="$TOKEN"

python3 /home/najmul/Projects/x19/agent/pulseops-agent.py
