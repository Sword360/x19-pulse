"use client";

import React, { useState, useEffect } from "react";
import { X, UserPlus, ShieldCheck, Eye, Trash2, CheckCircle2, User } from "lucide-react";

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "VIEWER";
  createdAt: string;
}

const DEFAULT_USERS: UserAccount[] = [
  {
    id: "1",
    name: "System Administrator",
    email: "admin@pulseops.io",
    role: "ADMIN",
    createdAt: "2026-08-01"
  },
  {
    id: "2",
    name: "Monitor User",
    email: "user@pulseops.io",
    role: "VIEWER",
    createdAt: "2026-08-01"
  }
];

export function UserManagementModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "VIEWER">("VIEWER");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("pulseops_user_list");
    if (stored) {
      try {
        setUsers(JSON.parse(stored));
      } catch {
        setUsers(DEFAULT_USERS);
      }
    } else {
      setUsers(DEFAULT_USERS);
      localStorage.setItem("pulseops_user_list", JSON.stringify(DEFAULT_USERS));
    }
  }, []);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    const newUser: UserAccount = {
      id: Date.now().toString(),
      name,
      email,
      role,
      createdAt: new Date().toISOString().split("T")[0]
    };

    const updated = [...users, newUser];
    setUsers(updated);
    localStorage.setItem("pulseops_user_list", JSON.stringify(updated));

    setName("");
    setEmail("");
    setPassword("");
    setRole("VIEWER");
    setMessage(`User ${newUser.email} created successfully as ${newUser.role}`);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteUser = (id: string) => {
    const updated = users.filter((u) => u.id !== id);
    setUsers(updated);
    localStorage.setItem("pulseops_user_list", JSON.stringify(updated));
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
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">User Access Management</h2>
            <p className="text-xs text-slate-400">Create & control operator accounts</p>
          </div>
        </div>

        {message && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Create User Form */}
        <form onSubmit={handleCreateUser} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 mb-6 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Create New System User</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Mercer"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@pulseops.io"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Assigned Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "ADMIN" | "VIEWER")}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="VIEWER">Viewer (Read-Only Telemetry)</option>
                <option value="ADMIN">Admin (Full Control)</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg text-xs transition flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-600/20"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create User Account</span>
          </button>
        </form>

        {/* Existing Users Table */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">System Accounts ({users.length})</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-800 text-xs"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200 block">{u.name}</span>
                    <span className="text-[10px] text-slate-500">{u.email}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      u.role === "ADMIN"
                        ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {u.role}
                  </span>
                  {u.email !== "admin@pulseops.io" && (
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition"
                      title="Remove Account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
