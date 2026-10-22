import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Mail, Lock, LogIn, Award } from "lucide-react";
import api from "../services/api";

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/auth/login", { email, password });
      const { accessToken, refreshToken, user } = response.data;
      
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("userRole", user.role);
      
      onLoginSuccess(user);
      navigate("/admin");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (roleEmail) => {
    setEmail(roleEmail);
    setPassword("Password123");
  };

  const roles = [
    { name: "Super Admin", email: "superadmin@certichain.com", color: "bg-red-500/10 text-red-400 border border-red-500/20" },
    { name: "Institute Admin", email: "admin@cit.edu", color: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
    { name: "HOD", email: "hod.cse@cit.edu", color: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
    { name: "Faculty (Issuer)", email: "faculty.cse@cit.edu", color: "bg-purple-500/10 text-purple-450 border border-purple-500/20" },
    { name: "Student", email: "student@cit.edu", color: "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20" },
  ];

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="glass-panel rounded-3xl p-8 space-y-8 border border-brand-purple/20 shadow-[0_0_50px_rgba(139,92,246,0.05)] relative overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-32 bg-brand-purple/5 rounded-full blur-2xl pointer-events-none"></div>
        
        {/* Title logo */}
        <div className="text-center space-y-3">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-full w-fit mx-auto text-brand-purple shadow-inner">
            <Award className="h-10 w-10 text-glow-purple" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold font-display text-white">Institutional Login</h2>
            <p className="text-xs text-slate-400">Access the CertiChain Credential management platform</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-950/20 border border-red-900 text-red-300 p-3 rounded-lg text-xs font-mono">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5 text-left">
            <label className="text-xs text-slate-450 font-medium">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                placeholder="email@institution.edu"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm glass-input"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs text-slate-450 font-medium">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm glass-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-purple to-indigo-600 hover:from-brand-purple hover:to-indigo-500 text-white font-semibold text-sm shadow-md hover:shadow-brand-purple/20 transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                <span>Log In</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Account Switcher */}
        <div className="space-y-3 pt-4 border-t border-slate-900 text-left">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Demo Quick Access Accounts</span>
          <div className="flex flex-col gap-2">
            {roles.map((role) => (
              <button
                key={role.name}
                type="button"
                onClick={() => handleQuickFill(role.email)}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer text-left transition-colors hover:bg-slate-800/40 flex justify-between items-center ${role.color}`}
              >
                <span>{role.name}</span>
                <span className="font-mono text-[9px] opacity-60">{role.email}</span>
              </button>
            ))}
          </div>
          <span className="text-[9px] text-slate-500 text-center block mt-1">Default Password is <code>Password123</code></span>
        </div>
      </div>
    </div>
  );
}
