"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Server,
  Cpu,
  HardDrive,
  ShieldCheck,
  Terminal,
  AlertTriangle,
  RefreshCw,
  LogOut,
  UserCheck,
  Lock,
  RotateCw,
  Power,
  Sliders,
  UserPlus,
  List,
  FileText,
  Monitor,
  Play,
  XCircle,
  Send,
  Search,
  Trash2,
  Square,
  Maximize2,
  Minimize2
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { UserManagementModal } from "./components/UserManagementModal";
import { AddServerModal } from "./components/AddServerModal";

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: "ADMIN" | "VIEWER" } | null>(null);
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isAddServerModalOpen, setIsAddServerModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "processes" | "logs" | "terminal" | "vnc">("overview");

  // Terminal State
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalOutput, setTerminalOutput] = useState("$ PulseOps Web Shell Initialized.\n$ Type commands below (e.g. ps, uptime, ls, whoami)\n");

  // Process Search & Server Search State
  const [processSearch, setProcessSearch] = useState("");
  const [serverSearch, setServerSearch] = useState("");

  // RealVNC State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [vncScaleMode, setVncScaleMode] = useState<"scale" | "off">("scale");
  const [vncActionLoading, setVncActionLoading] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleVncControl = async (action: "start_vnc" | "stop_vnc") => {
    if (currentUser?.role !== "ADMIN") {
      alert("VNC Service control is restricted to Admin accounts.");
      return;
    }
    setVncActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/agent/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          hostname: activeServerData.hostname
        })
      });
      if (res.ok) {
        const data = await res.json();
        setActionMessage(`[REALVNC ENGINE]: ${data.message || `VNC service ${action === "start_vnc" ? "started" : "stopped"}`}`);
        fetchServers();
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVncActionLoading(false);
    }
  };

  const toggleFullscreen = () => {
    const container = document.getElementById("vncViewerContainer");
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch((err) => console.error("Fullscreen error:", err));
    } else {
      document.exitFullscreen().catch((err) => console.error("Exit fullscreen error:", err));
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("pulseops_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    try {
      setCurrentUser(JSON.parse(storedUser));
    } catch {
      router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("pulseops_user");
    router.push("/login");
  };

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  const fetchServers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/servers`);
      if (res.ok) {
        const data = await res.json();
        setServers(data);
        // Only set default server if no server has been selected yet
        setSelectedServer((prev) => prev || (data.length > 0 ? data[0].hostname : null));
      }
    } catch (e) {
      console.error("Error fetching servers:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (hostname: string) => {
    try {
      const res = await fetch(`${API_URL}/api/servers/${hostname}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error("Error fetching history:", e);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchServers();
      const interval = setInterval(fetchServers, 3000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedServer) {
      fetchHistory(selectedServer);
      const interval = setInterval(() => fetchHistory(selectedServer), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedServer]);

  const activeServerData = servers.find((s) => s.hostname === selectedServer) || {
    hostname: selectedServer || "N/A",
    cpu: 0,
    memory: 0,
    disk: 0,
    status: "OFFLINE",
    load: [0, 0, 0],
    processes: [
      { pid: "1024", user: "root", cpu: "12.4", mem: "2.1", command: "systemd-journald" },
      { pid: "2048", user: "pulseops", cpu: "4.2", mem: "1.5", command: "pulseops-agent" },
      { pid: "3096", user: "www-data", cpu: "1.8", mem: "3.4", command: "nginx: worker process" },
      { pid: "4112", user: "postgres", cpu: "0.9", mem: "4.8", command: "postgres: main pool" }
    ],
    logs: [
      "[INFO] Systemd daemon started successfully",
      "[INFO] PulseOps agent heartbeat OK",
      "[NOTICE] Network interface eth0 link UP 1000 Mbps",
      "[INFO] Cron daemon job completed successfully"
    ]
  };

  const handleRemoveServer = async (hostname: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser?.role !== "ADMIN") return;
    if (!confirm(`Are you sure you want to remove server "${hostname}" from the database?`)) return;

    try {
      const res = await fetch(`${API_URL}/api/db/servers?hostname=${hostname}&requesterRole=${currentUser.role}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setActionMessage(`[DATABASE UPDATE]: Server node ${hostname} removed from database`);
        setSelectedServer(null);
        fetchServers();
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        const err = await res.json();
        alert(err.error || "Permission denied: Only Admin users can remove server nodes");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleProcessAction = async (pid: string, action: "kill" | "restart") => {
    if (currentUser?.role !== "ADMIN") return;
    try {
      const res = await fetch(`${API_URL}/api/agent/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: action === "kill" ? "kill_process" : "restart_process",
          hostname: activeServerData.hostname,
          pid
        })
      });
      if (res.ok) {
        setActionMessage(`[PROCESS CONTROL]: Process ${pid} ${action} command sent`);
        fetchServers();
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput;
    setTerminalInput("");

    try {
      const res = await fetch(`${API_URL}/api/agent/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "exec_terminal",
          hostname: activeServerData.hostname,
          command: cmd
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTerminalOutput((prev) => prev + data.output);
      }
    } catch (e) {
      setTerminalOutput((prev) => prev + `$ ${cmd}\nCommand executed.\n`);
    }
  };

  const filteredProcesses = (activeServerData.processes || []).filter((p: any) =>
    p.command.toLowerCase().includes(processSearch.toLowerCase()) ||
    p.user.toLowerCase().includes(processSearch.toLowerCase()) ||
    p.pid.includes(processSearch)
  );

  const filteredServers = servers.filter((s) =>
    s.hostname.toLowerCase().includes(serverSearch.toLowerCase())
  );

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-3.5 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide text-white">PulseOps Console</h1>
            <p className="text-[11px] text-slate-400">Enterprise Linux Management Suite</p>
          </div>
        </div>

        {/* User Session Profile */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5" title="Active User Session">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <div className="text-xs">
              <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">Active User</span>
              <span className="font-semibold text-slate-200 block">{currentUser.name}</span>
            </div>
            <span
              className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                currentUser.role === "ADMIN"
                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              }`}
            >
              {currentUser.role}
            </span>
          </div>

          <button
            onClick={() => setIsAddServerModalOpen(true)}
            className="flex items-center space-x-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl font-semibold transition shadow-md shadow-indigo-600/20"
          >
            <Server className="w-3.5 h-3.5" />
            <span>+ Add Server</span>
          </button>

          {currentUser.role === "ADMIN" && (
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="flex items-center space-x-1.5 text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 px-3 py-1.5 rounded-xl border border-indigo-500/30 transition font-medium"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Manage Users</span>
            </button>
          )}

          <button
            onClick={fetchServers}
            className="flex items-center space-x-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-xl border border-rose-500/20 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="bg-indigo-600/20 border-b border-indigo-500/30 text-indigo-300 text-xs px-6 py-2 flex items-center justify-between font-mono">
          <span>{actionMessage}</span>
          <span className="text-[10px] text-indigo-400 uppercase">Completed</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Server Nodes List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <Server className="w-4 h-4 text-indigo-400" />
              <span>Nodes ({filteredServers.length})</span>
            </h2>
          </div>

          {/* Hostname Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={serverSearch}
              onChange={(e) => setServerSearch(e.target.value)}
              placeholder="Search hostname..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="space-y-2">
            {filteredServers.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 text-center">
                <p className="text-xs text-slate-500">
                  {serverSearch ? `No hostname matching "${serverSearch}"` : "No active agents reporting."}
                </p>
                {!serverSearch && <p className="text-[10px] text-slate-600 mt-1">Run pulseops-agent daemon on Linux hosts.</p>}
              </div>
            ) : (
              filteredServers.map((s) => (
                <div
                  key={s.hostname}
                  onClick={() => setSelectedServer(s.hostname)}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                    selectedServer === s.hostname
                      ? "bg-slate-800/90 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                      : "bg-slate-900/40 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      {selectedServer === s.hostname && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                      )}
                      <span className={`font-semibold text-sm ${selectedServer === s.hostname ? "text-indigo-300 font-bold" : "text-slate-200"}`}>
                        {s.hostname}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                        {s.status}
                      </span>
                      {currentUser.role === "ADMIN" && (
                        <button
                          onClick={(e) => handleRemoveServer(s.hostname, e)}
                          className="text-slate-500 hover:text-rose-400 p-1 transition rounded hover:bg-rose-500/10"
                          title="Remove Server Node from Database"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-950/40 p-1.5 rounded-xl border border-slate-800/60">
                      <span className="block text-[10px] text-slate-500">CPU</span>
                      <span className="font-mono text-indigo-400 font-bold">{s.cpu}%</span>
                    </div>
                    <div className="bg-slate-950/40 p-1.5 rounded-xl border border-slate-800/60">
                      <span className="block text-[10px] text-slate-500">RAM</span>
                      <span className="font-mono text-emerald-400 font-bold">{s.memory}%</span>
                    </div>
                    <div className="bg-slate-950/40 p-1.5 rounded-xl border border-slate-800/60">
                      <span className="block text-[10px] text-slate-500">DISK</span>
                      <span className="font-mono text-cyan-400 font-bold">{s.disk}%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Feature Navigation Tabs & Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Navigation Bar Tabs */}
          <div className="flex space-x-2 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800 backdrop-blur">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "overview"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Metrics Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("processes")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "processes"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <List className="w-4 h-4" />
              <span>Processes</span>
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "logs"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>System Logs</span>
            </button>

            <button
              onClick={() => setActiveTab("terminal")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "terminal"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Web Terminal</span>
            </button>

            <button
              onClick={() => setActiveTab("vnc")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "vnc"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>noVNC Remote GUI</span>
            </button>
          </div>

          {/* TAB 1: OVERVIEW METRICS */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">{activeServerData.hostname}</h2>
                    <p className="text-xs text-slate-400">Host Hardware Telemetry</p>
                  </div>
                  <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-xl border border-slate-700">
                    Agent v1.0.0 Online
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400 font-medium">CPU Usage</span>
                      <Cpu className="w-4 h-4 text-indigo-400" />
                    </div>
                    <span className="text-2xl font-bold font-mono text-indigo-400 mt-2 block">{activeServerData.cpu}%</span>
                  </div>

                  <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400 font-medium">RAM Memory</span>
                      <Activity className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-2xl font-bold font-mono text-emerald-400 mt-2 block">{activeServerData.memory}%</span>
                  </div>

                  <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400 font-medium">Disk Storage</span>
                      <HardDrive className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span className="text-2xl font-bold font-mono text-cyan-400 mt-2 block">{activeServerData.disk}%</span>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Telemetry Timeline</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }} />
                      <Area type="monotone" dataKey="cpu" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} name="CPU %" />
                      <Area type="monotone" dataKey="memory" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="RAM %" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROCESS MANAGEMENT */}
          {activeTab === "processes" && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h3 className="text-base font-bold text-white">Linux Process Manager</h3>
                  <p className="text-xs text-slate-400">Monitor, terminate, or restart active host tasks</p>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={processSearch}
                    onChange={(e) => setProcessSearch(e.target.value)}
                    placeholder="Search PID or command..."
                    className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 uppercase text-[10px] text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">PID</th>
                      <th className="p-3">User</th>
                      <th className="p-3">CPU %</th>
                      <th className="p-3">MEM %</th>
                      <th className="p-3">Command</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredProcesses.map((proc: any) => (
                      <tr key={proc.pid} className="hover:bg-slate-800/30 transition">
                        <td className="p-3 text-indigo-400 font-bold">{proc.pid}</td>
                        <td className="p-3 text-slate-400">{proc.user}</td>
                        <td className="p-3 text-emerald-400">{proc.cpu}%</td>
                        <td className="p-3 text-cyan-400">{proc.mem}%</td>
                        <td className="p-3 text-slate-200 max-w-xs truncate">{proc.command}</td>
                        <td className="p-3 text-right">
                          {currentUser.role === "ADMIN" ? (
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleProcessAction(proc.pid, "restart")}
                                className="p-1 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40 transition"
                                title="Restart Process"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleProcessAction(proc.pid, "kill")}
                                className="p-1 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600/40 transition"
                                title="Kill Process (SIGTERM)"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-600 italic">Read-Only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM LOGS */}
          {activeTab === "logs" && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">System Journal Logs</h3>
                <p className="text-xs text-slate-400">Live journalctl & syslog output stream</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 max-h-96 overflow-y-auto space-y-1.5">
                {(activeServerData.logs || []).map((log: string, idx: number) => (
                  <div key={idx} className="hover:bg-slate-900/60 px-2 py-0.5 rounded transition">
                    <span className="text-slate-500 mr-2">[{idx + 1}]</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: WEB TERMINAL */}
          {activeTab === "terminal" && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-white">Interactive Web Terminal (PTY)</h3>
                  <p className="text-xs text-slate-400">Execute commands directly on host shell</p>
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-mono">
                  Bash Shell Connected
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 h-80 overflow-y-auto whitespace-pre-wrap">
                {terminalOutput}
              </div>

              {currentUser.role === "ADMIN" ? (
                <form onSubmit={handleTerminalSubmit} className="flex space-x-2">
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    placeholder="Enter command (e.g., uptime, ps, whoami)..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Run</span>
                  </button>
                </form>
              ) : (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-500 text-center">
                  Terminal execution is restricted to Admin role accounts.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: RealVNC REMOTE GUI */}
          {activeTab === "vnc" && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
              {/* Header & Status Bar */}
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-indigo-600/20 text-indigo-400 p-1.5 rounded-lg border border-indigo-500/30">
                      <Monitor className="w-4 h-4" />
                    </span>
                    <h3 className="text-base font-bold text-white">RealVNC Remote Desktop Viewer</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    High-performance X11 VNC graphical session stream (Port 6080 / 5900)
                  </p>
                </div>

                {/* Start VNC / Stop VNC Power Controls */}
                <div className="flex items-center space-x-3">
                  <span
                    className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
                      activeServerData.vnc_active !== false
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        activeServerData.vnc_active !== false ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
                      }`}
                    ></span>
                    <span>{activeServerData.vnc_active !== false ? "VNC Active" : "VNC Stopped"}</span>
                  </span>

                  {currentUser.role === "ADMIN" && (
                    <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => handleVncControl("start_vnc")}
                        disabled={vncActionLoading || activeServerData.vnc_active === true}
                        className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
                          activeServerData.vnc_active === true
                            ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
                        }`}
                        title="Start VNC Daemon on Remote Host"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start VNC</span>
                      </button>

                      <button
                        onClick={() => handleVncControl("stop_vnc")}
                        disabled={vncActionLoading || activeServerData.vnc_active === false}
                        className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
                          activeServerData.vnc_active === false
                            ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                            : "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
                        }`}
                        title="Stop VNC Daemon on Remote Host"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop VNC</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* RealVNC Viewer Window Container */}
              <div
                id="vncViewerContainer"
                className={`bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col transition-all shadow-2xl ${
                  isFullscreen ? "fixed inset-0 z-50 rounded-none border-0" : "min-h-[520px]"
                }`}
              >
                {/* RealVNC Viewer Toolbar */}
                <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap justify-between items-center text-xs text-slate-300 gap-2">
                  {/* Connection Status & Security */}
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 font-mono text-[11px]">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          activeServerData.vnc_active !== false ? "bg-emerald-400 animate-ping" : "bg-slate-600"
                        }`}
                      ></span>
                      <span className="text-slate-300 font-semibold">{activeServerData.hostname}:6080</span>
                    </div>

                    <span className="hidden sm:flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" />
                      <span>256-bit Encrypted Session</span>
                    </span>
                  </div>

                  {/* Toolbar Quick Action Controls */}
                  <div className="flex items-center space-x-2">
                    {/* Scale Mode Toggle */}
                    <button
                      onClick={() => setVncScaleMode((prev) => (prev === "scale" ? "off" : "scale"))}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition flex items-center space-x-1 ${
                        vncScaleMode === "scale"
                          ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
                      }`}
                      title="Toggle Canvas Auto-Scale"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>{vncScaleMode === "scale" ? "Auto Fit: ON" : "Auto Fit: OFF"}</span>
                    </button>

                    {/* Reconnect Session */}
                    <button
                      onClick={() => {
                        const iframe = document.getElementById("vncFrame") as HTMLIFrameElement;
                        if (iframe) iframe.src = iframe.src;
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] border border-slate-700 transition flex items-center space-x-1"
                      title="Reload VNC Stream"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reconnect</span>
                    </button>

                    {/* Fullscreen / Close Fullscreen Toggle */}
                    <button
                      onClick={toggleFullscreen}
                      className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition flex items-center space-x-1.5 shadow-md ${
                        isFullscreen
                          ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20"
                      }`}
                      title={isFullscreen ? "Close Fullscreen (Esc)" : "Enter Fullscreen Mode"}
                    >
                      {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                      <span>{isFullscreen ? "Close Fullscreen" : "Fullscreen"}</span>
                    </button>
                  </div>
                </div>

                {/* VNC Stream Canvas area */}
                <div className="flex-1 w-full bg-slate-950 flex items-center justify-center relative min-h-[460px]">
                  {activeServerData.vnc_active !== false ? (
                    <iframe
                      id="vncFrame"
                      src={`http://localhost:6080/vnc.html?host=localhost&port=6080&autoconnect=true&resize=${vncScaleMode}`}
                      className="w-full h-full border-0 bg-slate-950 min-h-[460px]"
                      title="RealVNC Desktop Display Stream"
                    />
                  ) : (
                    <div className="text-center p-8 max-w-md space-y-4">
                      <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-600">
                        <Power className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-200">VNC Service Currently Stopped</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          The TigerVNC / websockify background service is offline on server node{" "}
                          <span className="text-indigo-400 font-mono">{activeServerData.hostname}</span>.
                        </p>
                      </div>
                      {currentUser.role === "ADMIN" && (
                        <button
                          onClick={() => handleVncControl("start_vnc")}
                          disabled={vncActionLoading}
                          className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>Start VNC Service Now</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Floating Close Fullscreen Button Overlay in Fullscreen Mode */}
                  {isFullscreen && (
                    <button
                      onClick={toggleFullscreen}
                      className="absolute top-4 right-4 z-50 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold backdrop-blur flex items-center space-x-2 shadow-2xl transition"
                    >
                      <Minimize2 className="w-4 h-4 text-amber-400" />
                      <span>Close Fullscreen (Esc)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <UserManagementModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} />
      <AddServerModal isOpen={isAddServerModalOpen} onClose={() => setIsAddServerModalOpen(false)} />
    </div>
  );
}
