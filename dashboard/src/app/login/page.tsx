"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Activity, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      // 1. Check Hardcoded Default Accounts
      if (cleanEmail === "admin@pulseops.io" && cleanPassword === "admin123") {
        localStorage.setItem(
          "pulseops_user",
          JSON.stringify({ name: "Administrator", email: cleanEmail, role: "ADMIN" })
        );
        router.push("/");
        return;
      }

      if (cleanEmail === "user@pulseops.io" && cleanPassword === "user123") {
        localStorage.setItem(
          "pulseops_user",
          JSON.stringify({ name: "Monitor User", email: cleanEmail, role: "VIEWER" })
        );
        router.push("/");
        return;
      }

      // 2. Fetch User Accounts from Database API
      const res = await fetch("/api/db/users");
      if (res.ok) {
        const dbUserList = await res.json();
        const dbUser = dbUserList.find(
          (u: any) => u.email.toLowerCase() === cleanEmail
        );

        if (dbUser) {
          localStorage.setItem(
            "pulseops_user",
            JSON.stringify({ name: dbUser.name, email: dbUser.email, role: dbUser.role })
          );
          router.push("/");
          return;
        }
      }

      setError("Invalid email or password.");
    } catch (err) {
      console.error(err);
      setError("Authentication service error. Please try again.");
    } finally {
      setLoading(false);
    }
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
            <span>{loading ? "Authenticating..." : "Sign In"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
