"use client";

import React, { useState, useEffect } from "react";
import { X, UserPlus, Trash2, CheckCircle2, User, KeyRound, Lock, AlertCircle } from "lucide-react";

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "VIEWER";
  createdAt: string;
}

export function UserManagementModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "VIEWER">("VIEWER");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Password Reset state
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const fetchDbUsers = async () => {
    try {
      const res = await fetch("/api/db/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error("Error fetching db users:", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDbUsers();
      setError(null);
      setMessage(null);
    }
  }, [isOpen]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!name || !email || !password) {
      setError("Please fill out all fields.");
      return;
    }

    try {
      const storedUser = localStorage.getItem("pulseops_user");
      const currentUser = storedUser ? JSON.parse(storedUser) : null;

      const res = await fetch("/api/db/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          requesterRole: currentUser?.role || "VIEWER"
        })
      });

      if (res.ok) {
        const data = await res.json();
        setName("");
        setEmail("");
        setPassword("");
        setRole("VIEWER");
        setMessage(`User ${data.user.email} saved to database successfully.`);
        fetchDbUsers();
        setTimeout(() => setMessage(null), 4000);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to create user");
      }
    } catch (e) {
      console.error(e);
      setError("Network error creating user");
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!newPassword) {
      alert("Please enter a new password.");
      return;
    }

    try {
      const storedUser = localStorage.getItem("pulseops_user");
      const currentUser = storedUser ? JSON.parse(storedUser) : null;

      const res = await fetch("/api/db/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          newPassword,
          requesterRole: currentUser?.role || "VIEWER"
        })
      });

      if (res.ok) {
        setMessage(`Password reset successfully.`);
        setResetUserId(null);
        setNewPassword("");
        setTimeout(() => setMessage(null), 4000);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to reset password");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (id: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to remove user "${userEmail}" from the database?`)) return;

    try {
      const storedUser = localStorage.getItem("pulseops_user");
      const currentUser = storedUser ? JSON.parse(storedUser) : null;

      const res = await fetch(`/api/db/users?id=${id}&requesterRole=${currentUser?.role || "VIEWER"}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setMessage(`User account removed from database`);
        fetchDbUsers();
        setTimeout(() => setMessage(null), 4000);
      } else {
        const err = await res.json();
        alert(err.error || "Permission denied: Only Admin users can delete accounts");
      }
    } catch (e) {
      console.error(e);
    }
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
            <h2 className="text-lg font-bold text-white">Database User Management</h2>
            <p className="text-xs text-slate-400">Create, reset passwords, or remove system accounts</p>
          </div>
        </div>

        {message && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
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
                placeholder="Sarah Operator"
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
                placeholder="sarah@pulseops.io"
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
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Database Accounts ({users.length})</h3>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex flex-col bg-slate-950/40 p-3 rounded-xl border border-slate-800 text-xs space-y-2"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-slate-200 block">{u.name}</span>
                      <span className="text-[10px] text-slate-500">{u.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        u.role === "ADMIN"
                          ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {u.role}
                    </span>

                    <button
                      onClick={() => setResetUserId(resetUserId === u.id ? null : u.id)}
                      className="text-slate-400 hover:text-indigo-400 p-1 transition rounded hover:bg-indigo-500/10"
                      title="Reset Password"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>

                    {u.email !== "admin@pulseops.io" && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition rounded hover:bg-rose-500/10"
                        title="Remove Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Password Reset Box */}
                {resetUserId === u.id && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      onClick={() => handleResetPassword(u.id)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg text-xs transition font-medium"
                    >
                      Save Password
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
