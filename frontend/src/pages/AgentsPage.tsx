import { BrainCircuit, CheckCircle2, GitBranch, RotateCcw, ShieldCheck } from 'lucide-react';
import { agentSteps } from '../data/mockData';
import { useEffect, useState, useRef } from 'react';
import { fetchAIMonitorRecent, aiMonitorWebSocketUrl } from '../services/api';

type MonitorEvent = { ts: number; name: string; details: any };

export default function AgentsPage() {
  const [events, setEvents] = useState<MonitorEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchAIMonitorRecent().then((data) => {
      if (!mounted) return;
      setEvents((data || []).map((e: any) => ({ ts: e.ts, name: e.name, details: e.details })));
    }).catch(() => {});

    // open websocket
    try {
      const url = aiMonitorWebSocketUrl();
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'recent' || msg.type === 'update') {
            const newEvents = (msg.events || []).map((e: any) => ({ ts: e.ts, name: e.name, details: e.details }));
            setEvents((prev) => {
              const merged = [...newEvents, ...prev].slice(0, 50);
              return merged;
            });
          } else if (msg.type === 'event' && msg.event) setEvents((prev) => [msg.event, ...prev].slice(0, 50));
        } catch (e) {}
      };
    } catch (e) {}

    return () => { mounted = false; if (wsRef.current) wsRef.current.close(); };
  }, []);
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Agentic AI workflow</p>
        <h1 className="mt-2 text-3xl font-semibold">Triage, retrieval, generation, verification</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">LangChain/LangGraph-ready frontend showing every agent state, solution reliability score, approval gate, and self-correction path.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center gap-2">
            <BrainCircuit className="text-emerald-300" />
            <h2 className="text-xl font-semibold">Current agent run</h2>
          </div>
          <div className="mt-6 space-y-3">
            {agentSteps.map((step, index) => (
              <div key={step.name} className="flex gap-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-sm text-zinc-300">{index + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{step.name}</p>
                    <span className={`rounded-md border px-2 py-1 text-xs ${step.state === 'Running' ? 'border-sky-500/30 bg-sky-500/10 text-sky-200' : step.state === 'Required' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-zinc-700 bg-zinc-800 text-zinc-200'}`}>
                      {step.state}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold">Self-correction loop</h2>
            <div className="mt-5 grid gap-3 text-sm">
              {[
                ['Generate solution', CheckCircle2],
                ['Run verification', ShieldCheck],
                ['If failed, retrieve again', RotateCcw],
                ['Generate safer alternative', GitBranch],
              ].map(([label, Icon]) => (
                <div key={label as string} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-zinc-300">
                  <Icon size={17} className="text-emerald-300" />
                  {label as string}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold">Agent audit log</h2>
              <div className="mt-4 space-y-3">
                {events.map((e) => (
                  <div key={`${e.name}-${e.ts}`} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <p className="font-medium">{e.name}</p>
                      <span className="text-zinc-500">{new Date(e.ts * 1000).toLocaleTimeString()}</span>
                    </div>
                    <p className="mt-1 text-zinc-400">{typeof e.details === 'string' ? e.details : JSON.stringify(e.details)}</p>
                  </div>
                ))}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
