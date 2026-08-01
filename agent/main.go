// PulseOps Enterprise Linux Daemon Agent in Go
// Static single-binary build: CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o pulseops-agent main.go

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	ServerURL  string `json:"server_url"`
	AgentToken string `json:"agent_token"`
}

type MemoryInfo struct {
	Total     uint64  `json:"total"`
	Used      uint64  `json:"used"`
	Available uint64  `json:"available"`
	UsagePct  float64 `json:"usage_pct"`
}

type DiskInfo struct {
	Total    uint64  `json:"total"`
	Used     uint64  `json:"used"`
	Free     uint64  `json:"free"`
	UsagePct float64 `json:"usage_pct"`
}

type ProcessItem struct {
	PID     string `json:"pid"`
	User    string `json:"user"`
	CPU     string `json:"cpu"`
	Mem     string `json:"mem"`
	Command string `json:"command"`
}

type TelemetryPayload struct {
	Hostname   string        `json:"hostname"`
	Uptime     float64       `json:"uptime"`
	CPUUsage   float64       `json:"cpu_usage"`
	Memory     MemoryInfo    `json:"memory"`
	Disk       DiskInfo      `json:"disk"`
	LoadAvg    []float64     `json:"load_avg"`
	Processes  []ProcessItem `json:"processes"`
	Logs       []string      `json:"logs"`
	VNCActive  bool          `json:"vnc_active"`
	Timestamp  int64         `json:"timestamp"`
}

func getHostname() string {
	h, err := os.Hostname()
	if err != nil {
		return "linux-host"
	}
	return h
}

func getUptime() float64 {
	data, err := os.ReadFile("/proc/uptime")
	if err != nil {
		return 0
	}
	parts := strings.Fields(string(data))
	if len(parts) > 0 {
		v, _ := strconv.ParseFloat(parts[0], 64)
		return v
	}
	return 0
}

func getLoadAvg() []float64 {
	data, err := os.ReadFile("/proc/loadavg")
	if err != nil {
		return []float64{0, 0, 0}
	}
	parts := strings.Fields(string(data))
	if len(parts) >= 3 {
		l1, _ := strconv.ParseFloat(parts[0], 64)
		l5, _ := strconv.ParseFloat(parts[1], 64)
		l15, _ := strconv.ParseFloat(parts[2], 64)
		return []float64{l1, l5, l15}
	}
	return []float64{0, 0, 0}
}

func getRunningProcesses() []ProcessItem {
	procs := []ProcessItem{}
	out, err := exec.Command("ps", "-eo", "pid,user,pcpu,pmem,comm", "--sort=-pcpu").Output()
	if err != nil {
		return procs
	}
	lines := strings.Split(string(out), "\n")
	for i, line := range lines {
		if i == 0 || strings.TrimSpace(line) == "" || i > 25 {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) >= 5 {
			procs = append(procs, ProcessItem{
				PID:     fields[0],
				User:    fields[1],
				CPU:     fields[2],
				Mem:     fields[3],
				Command: strings.Join(fields[4:], " "),
			})
		}
	}
	return procs
}

func getSystemLogs() []string {
	out, err := exec.Command("journalctl", "-n", "30", "--no-pager").Output()
	if err != nil {
		return []string{"PulseOps Go agent running under daemon context."}
	}
	lines := strings.Split(string(out), "\n")
	result := []string{}
	for _, l := range lines {
		if strings.TrimSpace(l) != "" {
			result = append(result, l)
		}
	}
	return result
}

func main() {
	fmt.Printf("[PulseOps Go Agent] Initializing static agent daemon on %s (%s/%s)...\n", getHostname(), runtime.GOOS, runtime.GOARCH)

	serverURL := os.Getenv("PULSEOPS_SERVER")
	if serverURL == "" {
		serverURL = "https://x19-pulse.vercel.app"
	}
	agentToken := os.Getenv("PULSEOPS_TOKEN")
	if agentToken == "" {
		agentToken = "default-go-agent-token"
	}

	client := &http.Client{Timeout: 5 * time.Second}

	for {
		payload := TelemetryPayload{
			Hostname:  getHostname(),
			Uptime:    getUptime(),
			CPUUsage:  math.Round(15.5*100) / 100,
			LoadAvg:   getLoadAvg(),
			Processes: getRunningProcesses(),
			Logs:      getSystemLogs(),
			VNCActive: true,
			Timestamp: time.Now().Unix(),
		}

		bodyBytes, _ := json.Marshal(payload)
		req, err := http.NewRequest("POST", strings.TrimRight(serverURL, "/")+"/api/agent/metrics", bytes.NewBuffer(bodyBytes))
		if err == nil {
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+agentToken)
			resp, err := client.Do(req)
			if err == nil {
				resp.Body.Close()
			}
		}

		time.Sleep(3 * time.Second)
	}
}
