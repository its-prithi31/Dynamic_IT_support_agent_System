import { Cloud, Database, HardDrive, Server, WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Offline AI mode</p>
        <h1 className="mt-2 text-3xl font-semibold">Hybrid online and local support</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">Frontend setup view for Ollama, Llama 3, local FAISS, SQLite sync, cached documents, and cloud escalation.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['Cloud AI', 'Complex issues', Cloud],
          ['Ollama Llama 3', 'Common issues', Server],
          ['FAISS vector DB', 'Local retrieval', Database],
          ['SQLite cache', 'Offline records', HardDrive],
        ].map(([title, text, Icon]) => (
          <div key={title as string} className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <Icon size={21} className="text-emerald-300" />
            <p className="mt-3 font-semibold">{title as string}</p>
            <p className="mt-1 text-sm text-zinc-400">{text as string}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold">Offline workflow</h2>
          <div className="mt-5 space-y-3">
            {['User submits local issue', 'Local processor extracts text and logs', 'FAISS searches cached knowledge', 'Ollama generates answer', 'Sync ticket when network returns'].map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/15 text-sm text-emerald-200">{index + 1}</span>
                <span className="text-sm text-zinc-300">{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center gap-2">
            <WifiOff className="text-amber-300" />
            <h2 className="text-xl font-semibold">Offline readiness</h2>
          </div>
          <div className="mt-5 space-y-4 text-sm">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100">Local model available: llama3:8b</div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-zinc-300">Cached knowledge chunks: 4,820</div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-zinc-300">Pending sync items: 3 tickets, 9 AI logs</div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">Cloud escalation pauses until connection is restored.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
