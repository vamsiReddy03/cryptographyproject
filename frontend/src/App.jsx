import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { ShieldCheck, Wallet, Award, Activity, Cpu, Sun, Moon, LogOut, UserCheck } from "lucide-react";
import { connectWallet } from "./services/ethereum";
import Dashboard from "./pages/Dashboard";
import Verify from "./pages/Verify";
import Login from "./pages/Login";
import api from "./services/api";

// Simple navigation link component to highlight active path
const NavLink = ({ to, children }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
        isActive
          ? "bg-brand-purple/20 text-white border border-brand-purple/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
          : "text-slate-450 hover:text-white hover:bg-slate-800/40"
      }`}
    >
      {children}
    </Link>
  );
};

const Header = ({ wallet, onConnect, theme, setTheme, user, onLogout }) => {
  const [copied, setCopied] = useState(false);
  const location = useLocation();

  const copyAddress = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/50 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div className="absolute inset-0 bg-brand-purple rounded-xl blur-md opacity-55 animate-pulse"></div>
          <div className="relative bg-slate-900 border border-brand-purple/30 p-2 rounded-xl text-brand-purple">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>
        <div>
          <span className="font-display font-extrabold text-lg tracking-wider bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            VERICHAIN
          </span>
          <div className="text-[10px] text-brand-cyan tracking-widest font-mono text-glow-cyan font-bold leading-none uppercase">
            Secured Verification
          </div>
        </div>
      </div>

      <nav className="hidden md:flex items-center space-x-2">
        <NavLink to="/">Verification Portal</NavLink>
        {user ? (
          <NavLink to="/admin">Dashboard ({user.role})</NavLink>
        ) : (
          <NavLink to="/login">Issuer Login</NavLink>
        )}
      </nav>

      <div className="flex items-center space-x-3">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/60 bg-slate-900/10 dark:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all duration-300 cursor-pointer mr-1 flex items-center justify-center"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-500" />}
        </button>

        {user && (
          <div className="hidden lg:flex items-center space-x-2 bg-slate-900/60 border border-slate-850 px-3 py-1.5 rounded-xl text-xs text-slate-350">
            <UserCheck className="h-3.5 w-3.5 text-brand-cyan" />
            <span className="font-medium text-slate-200">{user.name}</span>
            <span className="text-[10px] bg-brand-purple/20 text-brand-purple border border-brand-purple/20 px-1.5 py-0.5 rounded-md font-bold uppercase">{user.role}</span>
          </div>
        )}

        {wallet.connected ? (
          <div className="flex items-center space-x-2 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-400 font-mono">
              {wallet.chainId === "31337"
                ? "Hardhat Local"
                : wallet.chainId === "11155111"
                ? "Sepolia Testnet"
                : `Network: ${wallet.chainId}`}
            </span>
            <div className="h-3 w-px bg-slate-800"></div>
            <button
              onClick={copyAddress}
              title="Click to copy address"
              className="text-slate-350 hover:text-white font-mono transition-colors focus:outline-none cursor-pointer font-bold"
            >
              {copied ? "Copied!" : `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}
            </button>
          </div>
        ) : (
          <button
            onClick={onConnect}
            className="flex items-center space-x-2 bg-gradient-to-r from-brand-purple to-indigo-600 hover:from-brand-purple hover:to-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl btn-glow-purple transition-all duration-300 active:scale-95 cursor-pointer"
          >
            <Wallet className="h-4 w-4" />
            <span>Connect Wallet</span>
          </button>
        )}

        {user && (
          <button
            onClick={onLogout}
            title="Log Out"
            className="p-2.5 rounded-xl border border-red-950 bg-red-950/10 hover:bg-red-950/30 text-red-400 transition-all cursor-pointer flex items-center justify-center"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
};

const AppContent = () => {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState({
    connected: false,
    address: "",
    chainId: "",
    signer: null,
    provider: null,
    error: ""
  });

  const navigate = useNavigate();

  // Load user profile if token exists
  const checkAuth = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await api.get("/auth/profile");
      setUser(response.data.user);
    } catch (err) {
      console.error("Auth check failed:", err.message);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleConnect = async () => {
    try {
      const conn = await connectWallet();
      setWallet({
        connected: true,
        address: conn.address,
        chainId: conn.chainId,
        signer: conn.signer,
        provider: conn.provider,
        error: ""
      });
    } catch (err) {
      console.error(err);
      setWallet((prev) => ({ ...prev, error: err.message }));
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      console.error("Logout request error", e);
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userRole");
    setUser(null);
    navigate("/login");
  };

  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          handleConnect();
        } else {
          setWallet({
            connected: false,
            address: "",
            chainId: "",
            signer: null,
            provider: null,
            error: ""
          });
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center text-slate-200">
        <div className="h-10 w-10 border-4 border-slate-800 border-t-brand-purple rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-mono mt-4">Authenticating session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col relative text-slate-200">
      {/* Decorative background glows */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-brand-purple/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[15%] w-[400px] h-[400px] rounded-full bg-brand-cyan/5 blur-[100px] pointer-events-none"></div>

      <Header 
        wallet={wallet} 
        onConnect={handleConnect} 
        theme={theme} 
        setTheme={setTheme} 
        user={user} 
        onLogout={handleLogout} 
      />

      {wallet.error && (
        <div className="bg-red-950/40 border-b border-red-900/50 text-red-300 px-6 py-3 text-center text-xs font-mono flex items-center justify-center space-x-2 animate-pulse">
          <span>⚠️ Connection Error: {wallet.error}</span>
          {wallet.error.includes("installed") && (
            <a 
              href="https://metamask.io/download/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="underline text-brand-cyan hover:text-cyan-300 font-bold"
            >
              Get MetaMask Extension
            </a>
          )}
        </div>
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-8">
        <Routes>
          <Route path="/" element={<Verify />} />
          <Route path="/login" element={<Login onLoginSuccess={(u) => setUser(u)} />} />
          <Route 
            path="/admin" 
            element={
              user ? (
                <Dashboard wallet={wallet} onConnect={handleConnect} user={user} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route path="*" element={<div className="text-center py-20 text-slate-400 font-display text-lg">Page not found.</div>} />
        </Routes>
      </main>

      <footer className="glass-panel border-t border-slate-900 px-6 py-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between">
        <p>© 2026 VeriChain. Secured Credential Issuance Engine.</p>
        <p className="flex items-center space-x-2 mt-2 sm:mt-0">
          <Cpu className="h-3 w-3 text-brand-purple" />
          <span>Anchored on Ethereum & IPFS Gateways</span>
        </p>
      </footer>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
