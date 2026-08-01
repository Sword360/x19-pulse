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
  UserPlus
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { UserManagementModal } from "./components/UserManagementModal";

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: "ADMIN" | "VIEWER" } | null>(null);
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

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
        if (data.length > 0 && !selectedServer) {
          setSelectedServer(data[0].hostname);
        }
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

  const triggerAdminAction = (actionName: string) => {
    if (currentUser?.role !== "ADMIN") return;
    setActionMessage(`[ADMIN COMMAND SENT]: ${actionName} initiated on ${selectedServer || "server"}`);
    setTimeout(() => setActionMessage(null), 4000);
  };

  const activeServerData = servers.find((s) => s.hostname === selectedServer) || {
    hostname: selectedServer || "N/A",
    cpu: 0,
    memory: 0,
    disk: 0,
    status: "OFFLINE",
    load: [0, 0, 0]
  };

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
            <p className="text-[11px] text-slate-400">Enterprise Linux Systems Management</p>
          </div>
        </div>

        {/* User Session & Role Indicator */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <div className="text-xs">
              <span className="font-semibold text-slate-200 block">{currentUser.name}</span>
              <span className="text-[10px] text-slate-400">{currentUser.email}</span>
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

      {/* Admin Action Notification Banner */}
      {actionMessage && (
        <div className="bg-indigo-600/20 border-b border-indigo-500/30 text-indigo-300 text-xs px-6 py-2 flex items-center justify-between">
          <span className="font-mono">{actionMessage}</span>
          <span className="text-[10px] text-indigo-400">Success</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Server List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
            <Server className="w-4 h-4 text-indigo-400" />
            <span>Active Server Nodes ({servers.length})</span>
          </h2>

          <div className="space-y-2">
            {servers.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 text-center">
                <p className="text-xs text-slate-500">No active agents reporting.</p>
                <p className="text-[10px] text-slate-600 mt-1">Run pulseops-agent daemon on Linux hosts.</p>
              </div>
            ) : (
              servers.map((s) => (
                <div
                  key={s.hostname}
                  onClick={() => setSelectedServer(s.hostname)}
                  className={`cursor-pointer p-4 rounded-2xl border transition ${
                    selectedServer === s.hostname
                      ? "bg-slate-800/80 border-indigo-500/50 shadow-lg shadow-indigo-500/5"
                      : "bg-slate-900/40 border-slate-800 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm text-slate-200">{s.hostname}</span>
                    <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {s.status}
                    </span>
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

        {/* Right Column: Host Telemetry & Administrative Controls */}
        <div className="lg:col-span-3 space-y-6">
          {/* Host Quick Overview & RBAC Controls */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-3">
                  <h2 className="text-lg font-bold text-white">{activeServerData.hostname}</h2>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-mono">
                    Linux Daemon Connected
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Realtime System Performance & Diagnostics</p>
              </div>

              {/* RBAC Control Actions Section */}
              <div className="flex flex-wrap items-center gap-2">
                {currentUser.role === "ADMIN" ? (
                  <>
                    <button
                      onClick={() => triggerAdminAction("Restart System Service")}
                      className="flex items-center space-x-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl transition shadow-md shadow-indigo-600/20"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Restart Services</span>
                    </button>
                    <button
                      onClick={() => triggerAdminAction("Launch Web Shell PTY")}
                      className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 transition"
                    >
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Launch Shell</span>
                    </button>
                    <button
                      onClick={() => triggerAdminAction("Reboot Server Node")}
                      className="flex items-center space-x-1.5 text-xs bg-rose-600/80 hover:bg-rose-500 text-white px-3 py-2 rounded-xl transition shadow-md shadow-rose-600/20"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>Reboot Host</span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-500">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Viewer Mode (Read-Only)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Metrics Gauge Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">CPU Utilization</span>
                  <Cpu className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono text-indigo-400">{activeServerData.cpu}%</span>
                  <span className="text-[11px] text-slate-500 font-mono">Load: {activeServerData.load?.join(", ")}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(activeServerData.cpu, 100)}%` }}></div>
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">Memory Allocation</span>
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono text-emerald-400">{activeServerData.memory}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(activeServerData.memory, 100)}%` }}></div>
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">Disk Storage</span>
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono text-cyan-400">{activeServerData.disk}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${Math.min(activeServerData.disk, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Realtime Chart */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Live Telemetry Timeline</h3>
            <div className="h-64 w-full">
              {history.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Awaiting telemetry stream from agent...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                    />
                    <Area type="monotone" dataKey="cpu" stroke="#6366f1" fillOpacity={1} fill="url(#colorCpu)" name="CPU %" />
                    <Area type="monotone" dataKey="memory" stroke="#10b981" fillOpacity={1} fill="url(#colorMem)" name="RAM %" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      <UserManagementModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} />
    </div>
  );
}
