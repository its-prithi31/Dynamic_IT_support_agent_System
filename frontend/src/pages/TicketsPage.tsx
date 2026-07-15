import { AlertTriangle, CheckCircle2, Clock, Filter, Search, ShieldCheck } from 'lucide-react';
import { assignTicket, commentTicket, resolveTicket, fetchTechnicians, fetchTickets } from '../services/api';
import { useEffect, useState } from 'react';

const statusStyles = {
  Open: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  'In Progress': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  'Waiting Approval': 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  Resolved: 'border-zinc-700 bg-zinc-800 text-zinc-200',
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTechs, setLoadingTechs] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadTickets = async () => {
      try {
        const data = await fetchTickets();
        if (mounted) setTickets(data || []);
      } catch {
        if (mounted) setTickets([]);
      } finally {
        if (mounted) setLoadingTickets(false);
      }
    };
    loadTickets();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshTickets = async () => {
    try {
      const data = await fetchTickets();
      setTickets(data || []);
    } catch {
      setTickets([]);
    }
  };

  const loadTechs = async () => {
    setLoadingTechs(true);
    try {
      const t = await fetchTechnicians();
      const nextTechs = t || [];
      return nextTechs;
    } catch (e) {
      return [];
    } finally {
      setLoadingTechs(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Ticket system</p>
          <h1 className="mt-2 text-3xl font-semibold">AI-classified support queue</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">Every ticket carries triage metadata, RAG solution reliability score, department routing, verification status, and approval state.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200"><Filter size={16} /> Filter</button>
          <button className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950"><Search size={16} /> Search</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <Clock className="text-sky-300" />
          <p className="mt-3 text-2xl font-semibold">{tickets.filter((ticket) => ticket.status !== 'Resolved').length}</p>
          <p className="text-sm text-zinc-400">Pending tickets</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <ShieldCheck className="text-amber-300" />
          <p className="mt-3 text-2xl font-semibold">{tickets.filter((ticket) => ticket.status === 'Waiting Approval').length}</p>
          <p className="text-sm text-zinc-400">Needs human approval</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <CheckCircle2 className="text-emerald-300" />
          <p className="mt-3 text-2xl font-semibold">{tickets.filter((ticket) => ticket.status === 'Resolved').length || '—'}</p>
          <p className="text-sm text-zinc-400">Resolved tickets</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
        <div className="grid grid-cols-[1.3fr_0.8fr_0.7fr_0.7fr_0.8fr] gap-4 border-b border-zinc-800 px-5 py-3 text-xs uppercase tracking-wide text-zinc-500">
          <span>Ticket</span>
          <span>Category</span>
          <span>Priority</span>
          <span>Status</span>
          <span>Solution reliability score</span>
        </div>
        {loadingTickets ? (
          <div className="px-5 py-8 text-sm text-zinc-400">Loading tickets…</div>
        ) : tickets.length === 0 ? (
          <div className="px-5 py-8 text-sm text-zinc-400">No tickets available.</div>
        ) : tickets.map((ticket) => (
          <div key={ticket.id} className="grid grid-cols-1 gap-4 border-b border-zinc-800 px-5 py-4 last:border-b-0 lg:grid-cols-[1.3fr_0.8fr_0.7fr_0.7fr_0.8fr]">
            <div>
              <p className="font-semibold">{ticket.id} - {ticket.title}</p>
              <p className="mt-1 text-sm text-zinc-400">{ticket.owner_id ? `Assigned technician ${ticket.owner_id}` : 'Unassigned'} · {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'Unknown date'}</p>
              <p className="mt-2 text-sm text-zinc-500">{ticket.solution || 'No resolution available yet.'}</p>
            </div>
            <div className="text-sm text-zinc-300">
              <p>{ticket.category}</p>
              <p className="mt-1 text-zinc-500">{ticket.department}</p>
            </div>
            <div>
              <span className={`inline-flex rounded-md border px-2 py-1 text-xs ${ticket.priority === 'Critical' || ticket.priority === 'High' ? 'border-rose-500/30 bg-rose-500/10 text-rose-200' : 'border-zinc-700 bg-zinc-800 text-zinc-200'}`}>
                {ticket.priority}
              </span>
            </div>
            <div>
              <span className={`inline-flex rounded-md border px-2 py-1 text-xs ${statusStyles[ticket.status as keyof typeof statusStyles] || statusStyles.Open}`}>
                {ticket.status}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-zinc-800">
                <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${ticket.confidence}%` }} />
              </div>
              <span className="text-sm text-zinc-300">{ticket.confidence}%</span>
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={async () => {
                const nextTechs = await loadTechs();
                const techId = nextTechs.length ? nextTechs[0].id : window.prompt('Enter technician id');
                if (!techId) return;
                await assignTicket(ticket.id, Number(techId));
                await refreshTickets();
                alert('Assigned');
              }} className="rounded px-2 py-1 text-xs bg-sky-600" disabled={loadingTechs}>
                {loadingTechs ? 'Loading...' : 'Assign'}
              </button>
              <button onClick={async () => {
                const c = window.prompt('Add comment'); if (!c) return; await commentTicket(ticket.id, c); await refreshTickets(); alert('Comment added');
              }} className="rounded px-2 py-1 text-xs bg-zinc-700">Comment</button>
              <button onClick={async () => {
                const r = window.prompt('Resolution summary'); if (!r) return; await resolveTicket(ticket.id, r); await refreshTickets(); alert('Resolved');
              }} className="rounded px-2 py-1 text-xs bg-emerald-600">Resolve</button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-100">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 shrink-0" />
          <p>Critical remediations, scripts, account changes, and recovery actions are locked behind explicit human approval in the UI.</p>
        </div>
      </div>
    </div>
  );
}
