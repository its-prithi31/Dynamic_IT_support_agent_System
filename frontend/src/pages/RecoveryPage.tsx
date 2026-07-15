import { CheckCircle2, ExternalLink, KeyRound, ShieldAlert, Smartphone } from 'lucide-react';
import { applications } from '../data/mockData';

const rules = ['Never store passwords', 'Never generate real OTPs', 'Never access private credentials', 'Use official recovery links only'];

export default function RecoveryPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Secure recovery</p>
        <h1 className="mt-2 text-3xl font-semibold">Login recovery assistant</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">Guided recovery for Amazon, Gmail, GitHub, Microsoft, and company applications without collecting passwords, OTPs, or private secrets.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/15 p-3 text-emerald-300">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Security guardrails</h2>
              <p className="text-sm text-zinc-400">Sensitive flows are locked to safe guidance.</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {rules.map((rule) => (
              <div key={rule} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300">
                <CheckCircle2 size={16} className="text-emerald-400" />
                {rule}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold">Official recovery flows</h2>
          <div className="mt-4 space-y-4">
            {applications.map((app) => (
              <div key={app.name} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{app.name}</p>
                    <p className="mt-1 text-sm text-zinc-400">{app.issue}</p>
                  </div>
                  <a className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200" href={app.url} target="_blank" rel="noreferrer">
                    Official page <ExternalLink size={14} />
                  </a>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-zinc-300 md:grid-cols-3">
                  <div className="rounded-md bg-zinc-900 p-3"><KeyRound className="mb-2 text-emerald-300" size={17} />Confirm account owner</div>
                  <div className="rounded-md bg-zinc-900 p-3"><Smartphone className="mb-2 text-emerald-300" size={17} />Complete MFA/backup flow</div>
                  <div className="rounded-md bg-zinc-900 p-3"><ShieldAlert className="mb-2 text-emerald-300" size={17} />Notify IT for risky cases</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
