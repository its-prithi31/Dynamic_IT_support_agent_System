import { useEffect, useState } from 'react';
import { fetchKnowledgeCandidates, approveKnowledgeCandidate } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, ShieldCheck, Clock, UserCheck, type LucideIcon } from 'lucide-react';

export default function KnowledgeApprovalPage() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchKnowledgeCandidates();
        if (mounted) setCandidates(data || []);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Unable to load candidates');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await fetchKnowledgeCandidates();
      setCandidates(data || []);
    } catch (err) {
      setCandidates([]);
      setError(err instanceof Error ? err.message : 'Unable to refresh candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    setApprovingId(id);
    setError('');
    try {
      await approveKnowledgeCandidate(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setApprovingId(null);
    }
  };

  if (user?.role !== 'Admin') {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-300">
        <div className="flex items-center gap-3 text-emerald-300">
          <ShieldCheck size={20} />
          <h1 className="text-xl font-semibold">Admin access required</h1>
        </div>
        <p className="mt-4 text-sm text-zinc-400">Only administrators can review and approve knowledge candidates in this workflow.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Knowledge approval</p>
        <h1 className="mt-2 text-3xl font-semibold">Review candidate knowledge</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">Approve verified ticket-derived knowledge before it becomes part of the searchable knowledge base.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {([
          ['Pending candidates', String(candidates.filter((c) => c.status === 'Pending Approval').length), Clock],
          ['Approved entries', String(candidates.filter((c) => c.status === 'Approved').length), CheckCircle2],
          ['Admin review', 'Required', UserCheck],
        ] as [string, string, LucideIcon][]).map(([label, value, Icon]) => (
          <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <Icon size={20} className="text-emerald-300" />
            <p className="mt-3 text-2xl font-semibold">{value}</p>
            <p className="text-sm text-zinc-400">{label}</p>
          </div>
        ))}
      </div>

      {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>}

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Candidate review queue</h2>
            <p className="mt-1 text-sm text-zinc-400">Approve the highest-quality extracted solutions so the RAG pipeline remains trusted.</p>
          </div>
          <button
            onClick={refresh}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">Loading candidates…</div>
          ) : candidates.length === 0 ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">No knowledge candidates are waiting for review.</div>
          ) : (
            candidates.map((candidate) => (
              <div key={candidate.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold">{candidate.title}</p>
                    <p className="mt-1 text-sm text-zinc-500">Ticket #{candidate.ticket_id} · {candidate.status} · Score {candidate.quality_score}%</p>
                  </div>
                  <button
                    onClick={() => handleApprove(candidate.id)}
                    disabled={candidate.status !== 'Pending Approval' || approvingId === candidate.id}
                    className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-700"
                  >
                    {candidate.status === 'Approved' ? 'Approved' : approvingId === candidate.id ? 'Approving...' : 'Approve'}
                  </button>
                </div>
                <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">
                  {candidate.content?.slice(0, 560) || 'No candidate content available.'}
                  {candidate.content && candidate.content.length > 560 ? '…' : ''}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
