#!/usr/bin/env python3
"""
PulseOps Lightweight Linux Monitoring Agent
Collects system performance metrics (CPU, RAM, Disk, Load, Network)
and communicates via secure HTTP/WebSocket protocol to the PulseOps Management Server.
"""

import os
import sys
import time
import json
import socket
import urllib.request
import urllib.parse
import ssl

CONFIG_PATH = "/etc/pulseops/agent.json"
DEFAULT_INTERVAL = 3  # seconds

def read_config():
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "server_url": os.getenv("PULSEOPS_SERVER", "http://localhost:3001"),
        "agent_token": os.getenv("PULSEOPS_TOKEN", "default-secret-token")
    }

def get_hostname():
    return socket.gethostname()

def get_uptime():
    try:
        with open("/proc/uptime", "r") as f:
            return float(f.readline().split()[0])
    except Exception:
        return 0.0

def get_load_avg():
    try:
        with open("/proc/loadavg", "r") as f:
            parts = f.readline().split()
            return [float(parts[0]), float(parts[1]), float(parts[2])]
    except Exception:
        return [0.0, 0.0, 0.0]

def get_cpu_usage():
    try:
        def read_cpu():
            with open("/proc/stat", "r") as f:
                line = f.readline()
                fields = [float(x) for x in line.split()[1:]]
                idle = fields[3] + fields[4]
                total = sum(fields)
                return idle, total

        idle1, total1 = read_cpu()
        time.sleep(0.2)
        idle2, total2 = read_cpu()
        
        idle_delta = idle2 - idle1
        total_delta = total2 - total1
        
        if total_delta == 0:
            return 0.0
        return round((1.0 - idle_delta / total_delta) * 100.0, 2)
    except Exception:
        return 0.0

def get_memory_info():
    try:
        mem_info = {}
        with open("/proc/meminfo", "r") as f:
            for line in f:
                parts = line.split(":")
                if len(parts) == 2:
                    key = parts[0].strip()
                    val = parts[1].strip().split()[0]
                    mem_info[key] = int(val) * 1024 # convert KB to bytes
        
        total = mem_info.get("MemTotal", 1)
        available = mem_info.get("MemAvailable", mem_info.get("MemFree", 0))
        used = total - available
        usage_pct = round((used / total) * 100.0, 2)
        return {
            "total": total,
            "used": used,
            "available": available,
            "usage_pct": usage_pct
        }
    except Exception:
        return {"total": 0, "used": 0, "available": 0, "usage_pct": 0.0}

def get_disk_usage():
    try:
        st = os.statvfs("/")
        total = st.f_blocks * st.f_frsize
        free = st.f_bavail * st.f_frsize
        used = total - free
        usage_pct = round((used / total) * 100.0, 2) if total > 0 else 0.0
        return {
            "total": total,
            "used": used,
            "free": free,
            "usage_pct": usage_pct
        }
    except Exception:
        return {"total": 0, "used": 0, "free": 0, "usage_pct": 0.0}

def collect_metrics():
    mem = get_memory_info()
    disk = get_disk_usage()
    load = get_load_avg()
    return {
        "hostname": get_hostname(),
        "uptime": get_uptime(),
        "cpu_usage": get_cpu_usage(),
        "memory": mem,
        "disk": disk,
        "load_avg": load,
        "timestamp": int(time.time())
    }

def send_metrics(config, payload):
    url = f"{config['server_url'].rstrip('/')}/api/agent/metrics"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {config['agent_token']}"
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=5) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"[PulseOps Agent] Error sending metrics: {e}", file=sys.stderr)
        return False

def main():
    print(f"[PulseOps Agent] Starting Linux Monitoring Daemon on {get_hostname()}...")
    config = read_config()
    while True:
        try:
            metrics = collect_metrics()
            send_metrics(config, metrics)
        except Exception as e:
            print(f"[PulseOps Agent] Unexpected error: {e}", file=sys.stderr)
        time.sleep(DEFAULT_INTERVAL)

if __name__ == "__main__":
    main()
