import React, { useState } from "react";
import {
  X,
  LogIn,
  UserPlus,
  Key,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Settings,
} from "lucide-react";
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithOAuth,
  type OAuthProvider,
  isSupabaseConfigured,
  saveSupabaseConfig,
  getSupabaseConfig,
} from "../lib/supabase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Supabase Configuration settings section
  const [showConfig, setShowConfig] = useState(!isSupabaseConfigured());
  const initialConfig = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(initialConfig.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(initialConfig.anonKey);
  const [configSaved, setConfigSaved] = useState(false);

  if (!isOpen) return null;

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim().startsWith("https://")) {
      setError("Project URL must start with https://");
      return;
    }
    saveSupabaseConfig(supabaseUrl, supabaseAnonKey);
    setConfigSaved(true);
    setError(null);
    setTimeout(() => {
      setConfigSaved(false);
      setShowConfig(false);
    }, 1200);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!isSupabaseConfigured()) {
      setShowConfig(true);
      setError("Please configure your Supabase Project URL and Anon Key first.");
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    try {
      if (tab === "signin") {
        await signInWithEmail(email.trim(), password);
        setSuccessMsg("Signed in successfully!");
        setTimeout(() => {
          onAuthSuccess();
          onClose();
        }, 500);
      } else {
        await signUpWithEmail(email.trim(), password);
        setSuccessMsg("Account created! Check your email if email confirmation is enabled, or sign in now.");
        setTimeout(() => {
          setTab("signin");
        }, 1500);
      }
    } catch (err: any) {
      setError(err?.message || "Authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: OAuthProvider) => {
    setError(null);
    setSuccessMsg(null);

    if (!isSupabaseConfigured()) {
      setShowConfig(true);
      setError("Please configure your Supabase Project URL and Anon Key first.");
      return;
    }

    setLoading(true);
    try {
      await signInWithOAuth(provider);
    } catch (err: any) {
      setError(err?.message || `Failed to initiate ${provider} authentication. Make sure ${provider} OAuth is enabled in Supabase Dashboard.`);
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-in fade-in duration-150 p-4"
      onClick={onClose}
    >
      <div
        className="
          relative w-full max-w-md rounded-3xl bg-zinc-950/95
          border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.9)]
          p-6 flex flex-col gap-4 text-white
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/25">
              <Database className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Supabase Cloud Sync</h3>
              <p className="text-xs text-zinc-400">Save and access your lectures from anywhere</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setTab("signin"); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
              tab === "signin"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => { setTab("signup"); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
              tab === "signup"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-400">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@example.com"
              className="
                w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10
                text-sm text-white placeholder:text-zinc-600 outline-none
                focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30
                transition-all
              "
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-400">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="
                w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10
                text-sm text-white placeholder:text-zinc-600 outline-none
                focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30
                transition-all
              "
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="
              flex items-center justify-center gap-2 w-full py-2.5 rounded-xl mt-2
              text-xs font-bold text-zinc-950 bg-gradient-to-r from-emerald-400 to-teal-400
              hover:opacity-90 shadow-lg shadow-emerald-500/25 transition-all active:scale-98
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : tab === "signin" ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Tapboard</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Educator Account</span>
              </>
            )}
          </button>
        </form>

        {/* ── OAuth Providers Divider ── */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink mx-3 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Or continue with
          </span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        {/* OAuth Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Google */}
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            disabled={loading}
            className="
              flex items-center justify-center gap-2 py-2 px-3 rounded-xl
              bg-white/[0.05] hover:bg-white/[0.1] border border-white/10
              text-xs font-semibold text-zinc-200 hover:text-white
              transition-all active:scale-95 disabled:opacity-50
            "
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Google</span>
          </button>

          {/* GitHub */}
          <button
            type="button"
            onClick={() => handleOAuth("github")}
            disabled={loading}
            className="
              flex items-center justify-center gap-2 py-2 px-3 rounded-xl
              bg-white/[0.05] hover:bg-white/[0.1] border border-white/10
              text-xs font-semibold text-zinc-200 hover:text-white
              transition-all active:scale-95 disabled:opacity-50
            "
          >
            <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            <span>GitHub</span>
          </button>
        </div>

        {/* Supabase Project Credentials Accordion */}
        <div className="pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => setShowConfig((p) => !p)}
            className="flex items-center justify-between w-full text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <span className="flex items-center gap-1.5 font-mono">
              <Settings className="w-3.5 h-3.5 text-zinc-500" />
              Supabase Project Connection
            </span>
            <span className="text-[10px] text-emerald-400">
              {isSupabaseConfigured() ? "Configured ✓" : "Setup Required"}
            </span>
          </button>

          {showConfig && (
            <form onSubmit={handleSaveConfig} className="flex flex-col gap-2.5 mt-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-mono text-zinc-400">Project URL</label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs font-mono text-zinc-200 outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-mono text-zinc-400">Anon Public Key</label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs font-mono text-zinc-200 outline-none focus:border-emerald-400"
                />
              </div>

              <button
                type="submit"
                className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
              >
                <Key className="w-3 h-3 text-emerald-400" />
                <span>{configSaved ? "Saved!" : "Save Credentials"}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
