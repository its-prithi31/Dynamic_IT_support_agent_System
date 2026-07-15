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
  ShieldCheck,
  TicketCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

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
              <div className="hidden items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 md:flex">
                <ShieldCheck size={16} />
                Secure session
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-7xl p-4 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
