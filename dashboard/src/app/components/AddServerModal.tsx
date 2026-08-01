"use client";

import React, { useState } from "react";
import { X, Server, Copy, Check, Terminal, ShieldCheck, Zap } from "lucide-react";

export function AddServerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const serverUrl = typeof window !== "undefined" ? window.location.origin : "https://x19-pulse.vercel.app";
  const agentToken = "pulse_agent_token_" + Math.random().toString(36).substring(2, 9);

  const githubInstallCommand = `curl -sSL https://raw.githubusercontent.com/Sword360/x19-pulse/main/agent/install.sh | bash -s -- ${serverUrl} ${agentToken}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-indigo-600/20 p-2.5 rounded-xl border border-indigo-500/30 text-indigo-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Add New Linux Server Node</h2>
            <p className="text-xs text-slate-400">1-Line GitHub Agent Auto-Installer</p>
          </div>
        </div>

        {/* 1-Line GitHub Installer */}
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>GitHub 1-Line Installer (Ubuntu / Debian / RHEL / WSL)</span>
              </span>
              <button
                onClick={() => copyToClipboard(githubInstallCommand)}
                className="flex items-center space-x-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition shadow-md shadow-indigo-600/20"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied Command!" : "Copy Command"}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Run this command on any Linux host. It fetches the latest agent code directly from GitHub and registers with your dashboard:
            </p>

            <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-lg font-mono text-xs text-emerald-400 break-all select-all">
              {githubInstallCommand}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
