"use client";

import React, { useEffect, useState } from "react";
import { Activity, Server, Cpu, HardDrive, ShieldCheck, Terminal, AlertTriangle, RefreshCw } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function Dashboard() {
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
    fetchServers();
    const interval = setInterval(fetchServers, 3000);
    return () => clearInterval(interval);
  }, []);

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
    load: [0, 0, 0]
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide text-white">PulseOps Console</h1>
            <p className="text-xs text-slate-400">Enterprise Linux Systems Monitoring Platform</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={fetchServers}
            className="flex items-center space-x-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-md border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ● Gateway Online
          </span>
        </div>
      </header>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Server List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
            <Server className="w-4 h-4 text-indigo-400" />
            <span>Monitored Hosts ({servers.length})</span>
          </h2>

          <div className="space-y-2">
            {servers.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-500">No active agents connected.</p>
                <p className="text-[10px] text-slate-600 mt-1">Run pulseops-agent daemon to connect hosts.</p>
              </div>
            ) : (
              servers.map((s) => (
                <div
                  key={s.hostname}
                  onClick={() => setSelectedServer(s.hostname)}
                  className={`cursor-pointer p-4 rounded-xl border transition ${
                    selectedServer === s.hostname
                      ? "bg-slate-800/80 border-indigo-500/50 shadow-lg shadow-indigo-500/5"
                      : "bg-slate-900/40 border-slate-800 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm text-slate-200">{s.hostname}</span>
                    <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {s.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-950/40 p-1.5 rounded border border-slate-800/60">
                      <span className="block text-[10px] text-slate-500">CPU</span>
                      <span className="font-mono text-indigo-400 font-semibold">{s.cpu}%</span>
                    </div>
                    <div className="bg-slate-950/40 p-1.5 rounded border border-slate-800/60">
                      <span className="block text-[10px] text-slate-500">RAM</span>
                      <span className="font-mono text-emerald-400 font-semibold">{s.memory}%</span>
                    </div>
                    <div className="bg-slate-950/40 p-1.5 rounded border border-slate-800/60">
                      <span className="block text-[10px] text-slate-500">DISK</span>
                      <span className="font-mono text-cyan-400 font-semibold">{s.disk}%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Active Host Details & Metrics */}
        <div className="lg:col-span-3 space-y-6">
          {/* Host Quick Overview */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">{activeServerData.hostname}</h2>
                <p className="text-xs text-slate-400">Linux Host Realtime Performance Telemetry</p>
              </div>
              <div className="flex space-x-2">
                <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-md border border-slate-700 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Agent v1.0.0</span>
                </span>
              </div>
            </div>

            {/* Metrics Gauge Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">CPU Load</span>
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

              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">Memory Usage</span>
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono text-emerald-400">{activeServerData.memory}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(activeServerData.memory, 100)}%` }}></div>
                </div>
              </div>

              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
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
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Resource Utilization Timeline</h3>
            <div className="h-64 w-full">
              {history.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Waiting for telemetry data points...
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
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
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
    </div>
  );
}
