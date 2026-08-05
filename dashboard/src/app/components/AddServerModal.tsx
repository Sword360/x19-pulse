"use client";

import React, { useState, useMemo, useEffect } from "react";
import { X, Server, Copy, Check, Terminal, ShieldCheck, Zap, PlusCircle } from "lucide-react";

export function AddServerModal({ 
  isOpen, 
  onClose,
  onServerAdded 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onServerAdded?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [manualHostname, setManualHostname] = useState("");
  const [manualIp, setManualIp] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [customServerUrl, setCustomServerUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCustomServerUrl(window.location.origin);
    }
  }, [isOpen]);

  const activeServerUrl = customServerUrl.trim() || (typeof window !== "undefined" ? window.location.origin : "https://x19-pulse.vercel.app");
  const isLocalhostUrl = activeServerUrl.includes("localhost") || activeServerUrl.includes("127.0.0.1");

  // Stable agent token that only generates once when modal opens
  const agentToken = useMemo(() => {
    return "pulse_agent_token_" + Math.random().toString(36).substring(2, 9);
  }, [isOpen]);

  const githubInstallCommand = `curl -fsSL https://cdn.jsdelivr.net/gh/Sword360/x19-pulse@main/agent/install.sh -o install.sh && sudo bash install.sh ${activeServerUrl} ${agentToken}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualHostname.trim()) return;

    setLoading(true);
    setSuccessMsg("");
    try {
      const res = await fetch("/api/db/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostname: manualHostname.trim(),
          ipAddress: manualIp.trim() || "127.0.0.1"
        })
      });

      if (res.ok) {
        setSuccessMsg(`Server node '${manualHostname.trim()}' added successfully!`);
        setManualHostname("");
        setManualIp("");
        if (onServerAdded) onServerAdded();
        setTimeout(() => {
          setSuccessMsg("");
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error("Failed to add server manually:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600/20 p-2.5 rounded-xl border border-indigo-500/30 text-indigo-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Add New Linux Server Node</h2>
            <p className="text-xs text-slate-400">Register server node manually or run the 1-line auto installer</p>
          </div>
        </div>

        {/* Manual Server Addition Form */}
        <form onSubmit={handleManualAdd} className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Option A: Direct Server Node Registration</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Server Hostname / Identifier *</label>
              <input
                type="text"
                required
                value={manualHostname}
                onChange={(e) => setManualHostname(e.target.value)}
                placeholder="e.g. ubuntu-vm-01"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">IP Address (Optional)</label>
              <input
                type="text"
                value={manualIp}
                onChange={(e) => setManualIp(e.target.value)}
                placeholder="e.g. 192.168.1.100"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            {successMsg ? (
              <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>{successMsg}</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">Instantly registers node in dashboard list</span>
            )}
            <button
              type="submit"
              disabled={loading || !manualHostname.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 shadow-md shadow-emerald-600/20"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{loading ? "Adding..." : "Add Server Node"}</span>
            </button>
          </div>
        </form>

        {/* 1-Line GitHub Installer */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Option B: GitHub 1-Line Auto-Installer Script</span>
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(githubInstallCommand)}
              className="flex items-center space-x-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition shadow-md shadow-indigo-600/20"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied Command!" : "Copy Command"}</span>
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">Target Dashboard Server URL</label>
            <input
              type="text"
              value={customServerUrl}
              onChange={(e) => setCustomServerUrl(e.target.value)}
              placeholder="e.g. http://192.168.1.50:3000 or https://x19-pulse.vercel.app"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-indigo-300 font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {isLocalhostUrl && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 text-xs text-amber-300">
              <p className="font-semibold mb-0.5">⚠️ Dashboard URL is currently set to localhost ({activeServerUrl})</p>
              <p className="text-[11px] text-amber-400/90">
                If running this installer on a <strong>remote server or VM</strong>, replace <code className="bg-amber-950/60 px-1 py-0.5 rounded text-amber-200">localhost</code> in the box above with your Dashboard host&apos;s public IP address (e.g. <code className="bg-amber-950/60 px-1 py-0.5 rounded text-amber-200">http://192.168.1.50:3000</code>).
              </p>
            </div>
          )}

          <p className="text-xs text-slate-400">
            Run this command on any Linux VM host to automatically install x11vnc, noVNC, and the telemetry agent:
          </p>

          <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-lg font-mono text-xs text-emerald-400 break-all select-all">
            {githubInstallCommand}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
