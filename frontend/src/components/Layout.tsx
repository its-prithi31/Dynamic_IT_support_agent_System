import { Link, useLocation } from 'react-router-dom';
import {
  Bot,
  BrainCircuit,
  Database,
  FileSearch,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Server,
  ShieldCheck,
  TicketCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl, getBackendMode, setApiBaseUrl, subscribeBackendMode } from '../services/api';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'AI Chat Support', path: '/support', icon: LifeBuoy },
  { label: 'Tickets', path: '/tickets', icon: TicketCheck },
  { label: 'Knowledge RAG', path: '/knowledge', icon: Database },
  { label: 'Knowledge Approval', path: '/knowledge-approval', icon: UserCheck },
  { label: 'Agent Workflow', path: '/agents', icon: BrainCircuit },
  { label: 'AI Operations', path: '/admin', icon: FileSearch },
  { label: 'Secure Recovery', path: '/recovery', icon: ShieldCheck },
  { label: 'Password & Apps', path: '/security', icon: KeyRound },
  { label: 'Offline AI', path: '/offline', icon: HardDrive },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [backendMode, setBackendMode] = useState<'live' | 'demo'>(getBackendMode());
  const [showConfig, setShowConfig] = useState(false);
  const [customUrl, setCustomUrl] = useState(getApiBaseUrl());

  useEffect(() => {
    return subscribeBackendMode((mode) => setBackendMode(mode));
  }, []);

  const handleSaveApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setApiBaseUrl(customUrl);
    setShowConfig(false);
    window.location.reload();
  };

  const handleResetApiUrl = () => {
    setApiBaseUrl('');
    setCustomUrl('/api');
    setShowConfig(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-80 border-r border-zinc-800 bg-zinc-950 p-5 transition lg:sticky lg:translate-x-0 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-3" onClick={() => setOpen(false)}>
              <div className="rounded-lg bg-emerald-500/15 p-3 text-emerald-300">
                <Bot size={22} />
              </div>
              <div>
                <p className="text-lg font-semibold">Aegis IT Autopilot</p>
                <p className="text-sm text-zinc-400">Secure digital assistant</p>
              </div>
            </Link>
            <button className="rounded-lg border border-zinc-800 p-2 lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation">
              <X size={18} />
            </button>
          </div>

          <nav className="mt-8 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition ${
                    active ? 'bg-emerald-500/15 text-emerald-200' : 'text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm font-medium text-zinc-300">Signed in as</p>
            <p className="mt-1 text-lg font-semibold">{user?.name}</p>
            <p className="text-sm text-zinc-400">{user?.role}</p>
            <button
              onClick={logout}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {['Cloud AI online', 'Offline ready', 'RAG verified', 'Approval gate'].map((item) => (
              <div key={item} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-300">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400" />
                {item}
              </div>
            ))}
          </div>
        </aside>

        {open && <button className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} aria-label="Close overlay" />}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/85 px-4 py-3 backdrop-blur md:px-8">
            <div className="flex items-center justify-between gap-4">
              <button className="rounded-lg border border-zinc-800 p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-400">AI-Powered Autonomous IT Support and Secure Digital Assistant</p>
                <p className="text-xs text-zinc-500">Frontend console connected to FastAPI, JWT, WebSocket, RAG, and offline AI APIs.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowConfig(true)}
                  title="Click to check or change backend API connection settings"
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    backendMode === 'live'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${backendMode === 'live' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {backendMode === 'live' ? 'Live Backend Connected' : 'Demo / Cloud Preview'}
                </button>
                <div className="hidden items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 md:flex">
                  <ShieldCheck size={16} />
                  Secure session
                </div>
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-7xl p-4 md:p-8">{children}</main>
        </div>
      </div>

      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-300">
                <Server size={20} />
                <h3 className="text-lg font-semibold">Backend Connection Settings</h3>
              </div>
              <button onClick={() => setShowConfig(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <p className="text-xs text-zinc-400">Current Mode</p>
                <p className="mt-1 font-semibold text-zinc-200">
                  {backendMode === 'live' ? '🟢 Live FastAPI Server' : '⚡ Client-Side Autonomous Demo (Offline)'}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {backendMode === 'live'
                    ? 'Connected to active Python FastAPI endpoints on ' + getApiBaseUrl()
                    : 'Backend server not detected on this domain. Running self-contained IT support simulation.'}
                </p>
              </div>

              <form onSubmit={handleSaveApiUrl} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300">Custom Backend API URL</label>
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://your-backend.onrender.com/api or /api"
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-zinc-400">
                    Leave as <code className="text-emerald-300">/api</code> for local Vite proxy, or enter your deployed backend URL.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    Save & Reconnect
                  </button>
                  <button
                    type="button"
                    onClick={handleResetApiUrl}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                  >
                    Reset Default
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
