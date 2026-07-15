import { useEffect, useState } from 'react';
import { Activity, BarChart3, CheckCircle2, FileCog, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  createPromptTemplate,
  deletePromptTemplate,
  fetchAIAudit,
  fetchAIMetrics,
  fetchAIPromptTemplates,
  fetchGuardrailLogs,
  updatePromptTemplate,
} from '../services/api';

type PromptTemplate = {
  id: string;
  role: string;
  template: string;
  version: string;
  metadata: Record<string, unknown>;
};

type AIMetrics = {
  ticket_count: number;
  waiting_approval: number;
  resolved_tickets: number;
  feedback_count: number;
  avg_confidence: number;
};

type GuardrailLog = {
  id: number;
  request_id: string;
  event_type: string;
  reason: string;
  details: Record<string, unknown>;
  created_at: string;
};

export default function AdminPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<AIMetrics | null>(null);
  const [audit, setAudit] = useState<{ logs: any[]; events: any[] }>({ logs: [], events: [] });
  const [guardrails, setGuardrails] = useState<GuardrailLog[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [formState, setFormState] = useState({
    prompt_id: '',
    version: '1.0',
    role: 'assistant',
    template: '',
    metadata: '{}',
  });

  const refreshData = async () => {
    setLoading(true);
    setError('');
    try {
      const [metricsData, auditData, guardrailData, promptData] = await Promise.all([
        fetchAIMetrics(),
        fetchAIAudit(),
        fetchGuardrailLogs(),
        fetchAIPromptTemplates(),
      ]);
      setMetrics(metricsData);
      setAudit(auditData);
      setGuardrails(guardrailData || []);
      setPrompts(promptData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    if (!mounted) return;
    void refreshData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const handleEdit = (prompt: PromptTemplate) => {
    setSelectedPrompt(prompt);
    setFormState({
      prompt_id: prompt.id,
      version: prompt.version,
      role: prompt.role,
      template: prompt.template,
      metadata: JSON.stringify(prompt.metadata || {}, null, 2),
    });
  };

  const handleCancelEdit = () => {
    setSelectedPrompt(null);
    setFormState({ prompt_id: '', version: '1.0', role: 'assistant', template: '', metadata: '{}' });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const metadata = JSON.parse(formState.metadata || '{}');
      if (!formState.prompt_id.trim() || !formState.template.trim()) {
        throw new Error('Prompt ID and template are required.');
      }
      if (selectedPrompt) {
        await updatePromptTemplate(selectedPrompt.id, selectedPrompt.version, {
          prompt_id: formState.prompt_id,
          version: formState.version,
          role: formState.role,
          template: formState.template,
          metadata,
        });
      } else {
        await createPromptTemplate({
          prompt_id: formState.prompt_id,
          version: formState.version,
          role: formState.role,
          template: formState.template,
          metadata,
        });
      }
      await refreshData();
      handleCancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (prompt: PromptTemplate) => {
    const confirmed = window.confirm(`Delete prompt ${prompt.id} v${prompt.version}?`);
    if (!confirmed) return;
    setSaving(true);
    setError('');
    try {
      await deletePromptTemplate(prompt.id, prompt.version);
      await refreshData();
      if (selectedPrompt?.id === prompt.id && selectedPrompt.version === prompt.version) {
        handleCancelEdit();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete prompt template');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'Admin') {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-300">
        <div className="flex items-center gap-3 text-emerald-300">
          <ShieldCheck size={20} />
          <h1 className="text-xl font-semibold">Administrator access required</h1>
        </div>
        <p className="mt-4 text-sm text-zinc-400">Only Admin users may manage prompt engineering, audit logs, and AI guardrails.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">AI Operations</p>
        <h1 className="mt-2 text-3xl font-semibold">Admin command center</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">Monitor AI governance, prompt lifecycle, guardrail events, and ticket escalation metrics from one production dashboard.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { title: 'AI tickets', value: metrics?.ticket_count ?? '—', icon: Activity },
          { title: 'Waiting approval', value: metrics?.waiting_approval ?? '—', icon: FileCog },
          { title: 'Resolved', value: metrics?.resolved_tickets ?? '—', icon: CheckCircle2 },
          { title: 'Avg confidence', value: metrics?.avg_confidence ? `${metrics.avg_confidence}%` : '—', icon: BarChart3 },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.title} className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-zinc-400">{metric.title}</p>
                <Icon size={18} className="text-emerald-300" />
              </div>
              <p className="mt-4 text-3xl font-semibold text-zinc-100">{metric.value}</p>
            </div>
          );
        })}
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Prompt engineering</h2>
              <p className="mt-1 text-sm text-zinc-400">Create, version, and manage the AI prompt templates used by the support routing pipeline.</p>
            </div>
            <button onClick={handleCancelEdit} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800" disabled={saving}>
              New prompt
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_0.5fr]">
              <label className="space-y-2 text-sm text-zinc-300">
                Prompt ID
                <input value={formState.prompt_id} onChange={(event) => handleInputChange('prompt_id', event.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none" />
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                Version
                <input value={formState.version} onChange={(event) => handleInputChange('version', event.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none" />
              </label>
            </div>

            <label className="space-y-2 text-sm text-zinc-300">
              Role
              <input value={formState.role} onChange={(event) => handleInputChange('role', event.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none" />
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              Template
              <textarea value={formState.template} onChange={(event) => handleInputChange('template', event.target.value)} rows={5} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none" />
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              Metadata (JSON)
              <textarea value={formState.metadata} onChange={(event) => handleInputChange('metadata', event.target.value)} rows={4} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none" />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">
                {selectedPrompt ? 'Update prompt' : 'Create prompt'}
              </button>
              {selectedPrompt ? (
                <button onClick={handleCancelEdit} disabled={saving} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800">
                  Cancel edit
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold">Guardrail event feed</h2>
          <p className="mt-2 text-sm text-zinc-400">Review the last recorded guardrail incidents that triggered safety or policy validation.</p>
          <div className="mt-4 space-y-3 max-h-[520px] overflow-y-auto pr-2">
            {loading ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">Loading guardrails…</div>
            ) : guardrails.length === 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">No guardrail logs found.</div>
            ) : (
              guardrails.slice(0, 8).map((entry) => (
                <div key={entry.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-zinc-100">{entry.event_type}</p>
                    <span className="text-xs text-zinc-500">{new Date(entry.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-400">Request {entry.request_id}</p>
                  <p className="mt-2 text-sm text-zinc-300">{entry.reason}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Audit and trace logs</h2>
            <p className="mt-1 text-sm text-zinc-400">Track AI requests, responses, and agent events for governance and post-incident review.</p>
          </div>
          <button onClick={refreshData} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800" disabled={loading}>
            Refresh
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <h3 className="text-sm font-semibold text-zinc-100">AI request audit</h3>
            <p className="mt-2 text-xs text-zinc-500">Latest request and response summaries.</p>
            {audit.logs.length === 0 ? (
              <div className="mt-4 text-sm text-zinc-400">No audit log entries available.</div>
            ) : (
              <ul className="mt-4 space-y-3 text-sm text-zinc-300">
                {audit.logs.slice(0, 6).map((item) => (
                  <li key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                    <p className="font-medium text-zinc-100">{item.route}</p>
                    <p className="mt-1 text-xs text-zinc-500">{item.created_at}</p>
                    <p className="mt-2 text-xs text-zinc-400">Status: {item.success ? 'Success' : 'Failure'}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <h3 className="text-sm font-semibold text-zinc-100">Agent events</h3>
            <p className="mt-2 text-xs text-zinc-500">Recent monitoring events from the agent workflow.</p>
            {audit.events.length === 0 ? (
              <div className="mt-4 text-sm text-zinc-400">No event records available.</div>
            ) : (
              <ul className="mt-4 space-y-3 text-sm text-zinc-300">
                {audit.events.slice(0, 6).map((event) => (
                  <li key={event.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                    <p className="font-medium text-zinc-100">{event.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">{event.created_at}</p>
                    <p className="mt-2 text-xs text-zinc-400">{JSON.stringify(event.details)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Prompt templates</h2>
            <p className="mt-1 text-sm text-zinc-400">Review and manage stored prompt versions used by the AI router.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Sparkles /> {prompts.length} total templates
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {prompts.length === 0 ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">No prompt templates are available yet.</div>
          ) : (
            prompts.map((prompt) => (
              <div key={`${prompt.id}-${prompt.version}`} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-100">{prompt.id} · v{prompt.version}</p>
                    <p className="mt-1 text-xs text-zinc-500">Role: {prompt.role}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(prompt)} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800">Edit</button>
                    <button onClick={() => handleDelete(prompt)} className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/20">Delete</button>
                  </div>
                </div>
                <div className="mt-4 text-sm leading-6 text-zinc-300">
                  {prompt.template.length > 280 ? `${prompt.template.slice(0, 280)}…` : prompt.template}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
