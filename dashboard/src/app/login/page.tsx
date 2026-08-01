"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Mail, Activity, Eye, KeyRound, Server, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    setTimeout(() => {
      const storedUsers = localStorage.getItem("pulseops_user_list");
      let userList = [];
      if (storedUsers) {
        try {
          userList = JSON.parse(storedUsers);
        } catch {}
      }

      const foundUser = userList.find(
        (u: any) => u.email === email && (u.password === password || (!u.password && password === "admin123"))
      );

      if (email === "admin@pulseops.io" && password === "admin123") {
        localStorage.setItem(
          "pulseops_user",
          JSON.stringify({ name: "Administrator", email, role: "ADMIN" })
        );
        router.push("/");
      } else if (email === "user@pulseops.io" && password === "user123") {
        localStorage.setItem(
          "pulseops_user",
          JSON.stringify({ name: "Monitor User", email, role: "VIEWER" })
        );
        router.push("/");
      } else if (foundUser) {
        localStorage.setItem(
          "pulseops_user",
          JSON.stringify({ name: foundUser.name, email: foundUser.email, role: foundUser.role })
        );
        router.push("/");
      } else {
        setError("Invalid email or password.");
        setLoading(false);
      }
    }, 500);
  };

  const setPresetUser = (role: "ADMIN" | "VIEWER") => {
    if (role === "ADMIN") {
      setEmail("admin@pulseops.io");
      setPassword("admin123");
    } else {
      setEmail("user@pulseops.io");
      setPassword("user123");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white mb-3 shadow-lg shadow-indigo-500/25">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">PulseOps Portal</h1>
          <p className="text-xs text-slate-400 mt-1">Enterprise Server Access Management</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">User Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pulseops.io"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition text-sm flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20"
          >
            <span>{loading ? "Authenticating..." : "Authenticate Session"}</span>
          </button>
        </form>

        {/* Preset Enterprise Roles */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
            Select Role Credentials
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPresetUser("ADMIN")}
              className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 transition text-left flex items-start space-x-2.5"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <span className="block text-xs font-bold text-indigo-300">Admin</span>
                <span className="block text-[10px] text-slate-400">Control & Reboot</span>
              </div>
            </button>

            <button
              onClick={() => setPresetUser("VIEWER")}
              className="p-3 rounded-xl border border-slate-700 bg-slate-800/40 hover:bg-slate-800/70 transition text-left flex items-start space-x-2.5"
            >
              <Eye className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="block text-xs font-bold text-slate-300">Viewer User</span>
                <span className="block text-[10px] text-slate-400">Read-Only Telemetry</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
