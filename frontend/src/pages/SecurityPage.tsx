import { applications } from '../data/mockData';
import { KeyRound, Lock, RefreshCw, ShieldCheck, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';

function scorePassword(value: string) {
  let score = 0;
  if (value.length >= 12) score += 30;
  if (/[A-Z]/.test(value)) score += 20;
  if (/[a-z]/.test(value)) score += 15;
  if (/\d/.test(value)) score += 15;
  if (/[^A-Za-z0-9]/.test(value)) score += 20;
  return Math.min(score, 100);
}

export default function SecurityPage() {
  const [password, setPassword] = useState('N3ver-Store-This!');
  const score = useMemo(() => scorePassword(password), [password]);
  const suggestion = 'River-Quartz-74!Vault';

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Password and apps</p>
        <h1 className="mt-2 text-3xl font-semibold">Security assistant and usage analyzer</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">Analyze password strength locally, suggest strong passwords without storing them, and infer likely applications from usage history.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center gap-2">
            <KeyRound className="text-emerald-300" />
            <h2 className="text-xl font-semibold">Password strength</h2>
          </div>
          <label className="mt-5 block text-sm text-zinc-400">Test password</label>
          <input value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-emerald-500" />
          <div className="mt-4 h-3 rounded-full bg-zinc-800">
            <div className="h-3 rounded-full bg-emerald-400" style={{ width: `${score}%` }} />
          </div>
          <p className="mt-2 text-sm text-zinc-400">Strength score: <span className="text-zinc-100">{score}%</span></p>
          <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            Suggested strong password: <span className="font-semibold">{suggestion}</span>
            <p className="mt-1 text-emerald-100/75">Generated in the browser view only. It is not stored.</p>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-emerald-300" />
            <h2 className="text-xl font-semibold">Application usage analyzer</h2>
          </div>
          <div className="mt-4 space-y-3">
            {applications.map((app) => (
              <div key={app.name} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{app.name}</p>
                    <p className="mt-1 text-sm text-zinc-500">{app.category} - Last used {app.lastUsed}</p>
                  </div>
                  <span className="text-sm text-zinc-300">{app.usage}% usage</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-zinc-800">
                  <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${app.usage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['No secret storage', Lock],
          ['Strong reset hygiene', RefreshCw],
          ['MFA-first guidance', ShieldCheck],
        ].map(([label, Icon]) => (
          <div key={label as string} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-5 text-zinc-300">
            <Icon size={18} className="text-emerald-300" />
            {label as string}
          </div>
        ))}
      </div>
    </div>
  );
}
