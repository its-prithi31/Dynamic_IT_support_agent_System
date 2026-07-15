import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CircleDashed,
  FileText,
  Image,
  Paperclip,
  RefreshCcw,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { fetchKnowledge, postSupportChat, submitAIFeedback } from '../services/api';

type ChatMessage = {
  id: number;
  sender: 'user' | 'assistant';
  text: string;
  attachments?: string[];
};

type SupportResponse = {
  response?: string;
  escalate?: boolean;
  ticket_id?: number;
  request_id?: string;
  category?: string;
  classification?: string;
  priority?: string;
  team?: string;
  department?: string;
  cause?: string;
  rootCause?: string;
  root_cause?: string;
  solution?: string | string[];
  answer?: string;
  verification?: string;
  verify?: string;
  confidence?: number;
};

type IncidentBriefing = {
  category: string;
  priority: string;
  team: string;
  rootCause: string;
  solution: string[];
  verification: string;
  confidence?: number;
};

type PendingRequest = {
  query: string;
  attachments: string[];
};

const welcome: ChatMessage = {
  id: 1,
  sender: 'assistant',
  text: 'I’m ready to triage an IT incident. Include the affected service, what changed, and the exact error if you have it.',
};

function normalizeBriefing(response: SupportResponse): IncidentBriefing {
  const rawSolution = response.solution ?? response.answer ?? response.response ?? (response.escalate ? `Escalated to an IT technician${response.ticket_id ? ` as ticket #${response.ticket_id}` : ''}.` : 'No remediation steps were returned.');
  const solution = Array.isArray(rawSolution)
    ? rawSolution
    : rawSolution.split(/\n|(?<=\.)\s+(?=[A-Z])/).filter(Boolean);

  return {
    category: response.category ?? response.classification ?? 'Unclassified incident',
    priority: response.priority ?? 'Needs review',
    team: response.team ?? response.department ?? 'IT Support',
    rootCause: response.rootCause ?? response.root_cause ?? response.cause ?? 'The service needs additional evidence to confirm a root cause.',
    solution,
    verification: response.verification ?? response.verify ?? 'Confirm the service is available and report the result.',
    confidence: response.confidence,
  };
}

function briefingMessage(briefing: IncidentBriefing, escalated: boolean, ticketId?: number) {
  const steps = briefing.solution.slice(0, 3).map((step, index) => `${index + 1}. ${step}`).join(' ');
  const escalation = escalated ? ` A technician review ticket${ticketId ? ` (#${ticketId})` : ''} has been created because the answer needs trusted source confirmation.` : '';
  return `Problem: ${briefing.category} (${briefing.priority}). Likely cause: ${briefing.rootCause} Recommended actions: ${steps} Verify: ${briefing.verification}${escalation}`;
}

function priorityTone(priority: string) {
  const label = priority.toLowerCase();
  if (label.includes('critical') || label.includes('high')) return 'border-rose-400/30 bg-rose-400/10 text-rose-200';
  if (label.includes('medium')) return 'border-amber-300/30 bg-amber-300/10 text-amber-100';
  return 'border-sky-300/30 bg-sky-300/10 text-sky-100';
}

export default function SupportPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [briefing, setBriefing] = useState<IncidentBriefing | null>(null);
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verification, setVerification] = useState<'idle' | 'passed' | 'retry'>('idle');
  const [lastRequest, setLastRequest] = useState<PendingRequest | null>(null);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [satisfactionScore, setSatisfactionScore] = useState(3);
  const [connectionState, setConnectionState] = useState<'unknown' | 'loading' | 'connected' | 'unavailable'>('unknown');

  const handleSubmitFeedback = async (helpful: boolean, successful: boolean) => {
    if (!lastRequestId) return;
    setFeedbackStatus('submitting');
    setFeedbackMessage(null);

    try {
      await submitAIFeedback(lastRequestId, helpful, successful, satisfactionScore, feedbackComment);
      setFeedbackStatus('submitted');
      setFeedbackMessage(helpful ? 'Thank you — your rating helps improve future recommendations.' : 'Feedback recorded. A human review path will be prioritized.' );
    } catch {
      setFeedbackStatus('error');
      setFeedbackMessage('Unable to submit feedback. Please try again later.');
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadKnowledge = async () => {
      try {
        const data = await fetchKnowledge();
        if (mounted) setKnowledge(data || []);
      } catch {
        if (mounted) setKnowledge([]);
      } finally {
        if (mounted) setLoadingKnowledge(false);
      }
    };
    loadKnowledge();
    return () => {
      mounted = false;
    };
  }, []);

  const sendMessage = async (request?: PendingRequest, addMessage = true) => {
    const query = request?.query ?? draft.trim();
    const attachments = request?.attachments ?? files.map((file) => file.name);
    if ((!query && !attachments.length) || isLoading) return;

    const submittedRequest = { query: query || 'Analyze attached evidence.', attachments };
    if (addMessage) {
      setMessages((current) => [
        ...current,
        { id: Date.now(), sender: 'user', text: submittedRequest.query, attachments },
      ]);
    }
    setLastRequest(submittedRequest);
    setDraft('');
    setFiles([]);
    setBriefing(null);
    setError(null);
    setVerification('idle');
    setIsLoading(true);
    setConnectionState('loading');

    try {
      const result = await postSupportChat(submittedRequest.query, attachments) as SupportResponse;
      setLastRequestId(result.request_id ?? null);
      setFeedbackStatus('idle');
      setFeedbackMessage(null);
      const nextBriefing = normalizeBriefing(result);
      setBriefing(nextBriefing);
      setMessages((current) => [...current, { id: Date.now() + 1, sender: 'assistant', text: briefingMessage(nextBriefing, Boolean(result.escalate), result.ticket_id) }]);
      setConnectionState('connected');
    } catch {
      setError('The support service could not be reached. Check your connection and try again.');
      setConnectionState('unavailable');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <main className="space-y-6">
      <header className="relative overflow-hidden border-b border-emerald-400/20 bg-zinc-950 px-6 py-7 shadow-[inset_0_-1px_0_rgba(52,211,153,0.08)] sm:px-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.28em] text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" /> Live triage console
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Support, with a clear next move.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Submit the signal. Aegis routes it through classification, trusted retrieval, and verification-aware remediation.</p>
          </div>
          <div className="flex items-center gap-2 border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-200">
            <ShieldCheck size={15} /> Protected guidance · no credentials required
          </div>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,.82fr)]">
        <section aria-label="Support conversation" className="flex min-h-[690px] flex-col border border-zinc-800 bg-zinc-950 shadow-[16px_16px_0_rgba(16,185,129,0.04)]">
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"><Bot size={19} /></div>
              <div><h2 className="font-semibold text-zinc-100">Aegis analyst</h2><p className="text-xs text-zinc-500">Evidence-first incident support</p></div>
            </div>
            <span className={`flex items-center gap-2 text-xs ${connectionState === 'unavailable' ? 'text-rose-200' : connectionState === 'loading' ? 'text-amber-100' : connectionState === 'connected' ? 'text-emerald-200' : 'text-zinc-400'}`}>
              <CircleDashed size={14} className={connectionState === 'unavailable' ? 'text-rose-300' : connectionState === 'loading' ? 'animate-spin text-amber-300' : connectionState === 'connected' ? 'text-emerald-300' : 'text-zinc-500'} />
              {connectionState === 'unavailable' ? 'API unavailable' : connectionState === 'loading' ? 'Contacting API' : connectionState === 'connected' ? 'API connected' : 'API not checked'}
            </span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
            {messages.map((message) => (
              <article key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] border px-4 py-3 text-sm leading-6 ${message.sender === 'user' ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-50' : 'border-zinc-800 bg-zinc-900 text-zinc-300'}`}>
                  <p>{message.text}</p>
                  {!!message.attachments?.length && <p className="mt-2 border-t border-emerald-300/15 pt-2 text-xs text-emerald-200">Evidence: {message.attachments.join(', ')}</p>}
                </div>
              </article>
            ))}
            {isLoading && <div className="flex items-center gap-3 text-sm text-emerald-200"><span className="h-2 w-2 animate-ping rounded-full bg-emerald-300" /> Analyzing evidence and composing a briefing…</div>}
          </div>

          <div className="border-t border-zinc-800 p-4">
            {!!files.length && <div className="mb-3 flex flex-wrap gap-2">{files.map((file) => <span key={`${file.name}-${file.lastModified}`} className="flex items-center gap-2 border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300">{file.name}<button onClick={() => setFiles((current) => current.filter((item) => item !== file))} aria-label={`Remove ${file.name}`} className="text-zinc-500 hover:text-rose-300"><X size={13} /></button></span>)}</div>}
            <div className="flex items-center gap-3 border border-zinc-700 bg-zinc-900 p-2 focus-within:border-emerald-400/60">
              <label title="Attach evidence" className="cursor-pointer p-2 text-zinc-400 hover:bg-zinc-800 hover:text-emerald-300"><Paperclip size={18} /><input multiple type="file" accept=".png,.jpg,.jpeg,.pdf,.log,.txt,.csv" className="hidden" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></label>
              <input value={draft} disabled={isLoading} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} className="min-w-0 flex-1 bg-transparent px-1 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 disabled:cursor-not-allowed" placeholder="Describe the issue or paste the exact error…" />
              <button onClick={() => void sendMessage()} disabled={isLoading || (!draft.trim() && !files.length)} className="grid h-9 w-9 place-items-center bg-emerald-300 text-zinc-950 transition hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500" aria-label="Send incident"><Send size={16} /></button>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <section aria-live="polite" className="border border-zinc-800 bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4"><div className="flex items-center gap-2"><Sparkles size={17} className="text-emerald-300" /><h2 className="font-semibold text-zinc-100">Incident briefing</h2></div>{briefing && <span className={`border px-2 py-1 text-xs ${priorityTone(briefing.priority)}`}>{briefing.priority}</span>}</div>
            {error && <div role="alert" className="m-5 border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100"><div className="flex gap-2 font-medium"><AlertTriangle size={17} /> Analysis unavailable</div><p className="mt-2 text-rose-100/80">{error}</p>{lastRequest && <button onClick={() => void sendMessage(lastRequest, false)} className="mt-3 inline-flex items-center gap-2 border border-rose-300/30 px-3 py-2 text-xs hover:bg-rose-300/10"><RefreshCcw size={14} /> Retry request</button>}</div>}
            {!briefing && !error && !isLoading && <div className="px-5 py-12 text-center"><CircleDashed className="mx-auto text-zinc-700" size={28} /><p className="mt-3 text-sm text-zinc-400">No incident is active.</p><p className="mt-1 text-xs leading-5 text-zinc-600">Your API response will appear here as a structured, actionable briefing.</p></div>}
            {isLoading && <div className="space-y-3 px-5 py-8"><div className="h-3 w-2/5 animate-pulse bg-zinc-800" /><div className="h-16 animate-pulse bg-zinc-900" /><div className="h-12 animate-pulse bg-zinc-900" /></div>}
            {briefing && <div className="divide-y divide-zinc-800">
              <div className="grid grid-cols-1 gap-px bg-zinc-800 sm:grid-cols-2"><div className="bg-zinc-950 p-4"><p className="text-[10px] font-medium uppercase tracking-[.18em] text-zinc-600">Category</p><p className="mt-1 break-words text-sm text-zinc-200">{briefing.category}</p></div><div className="bg-zinc-950 p-4"><p className="text-[10px] font-medium uppercase tracking-[.18em] text-zinc-600">Route to</p><p className="mt-1 break-words text-sm text-zinc-200">{briefing.team}</p></div></div>
              <BriefSection label="Root cause" value={briefing.rootCause} />
              <div className="p-5"><p className="text-[10px] font-medium uppercase tracking-[.18em] text-emerald-400">Solution</p><ol className="mt-3 space-y-2">{briefing.solution.map((step, index) => <li key={`${step}-${index}`} className="flex gap-3 text-sm leading-5 text-zinc-300"><span className="grid h-5 w-5 shrink-0 place-items-center border border-emerald-400/30 text-[10px] text-emerald-200">{index + 1}</span>{step}</li>)}</ol></div>
              <BriefSection label="Verification" value={briefing.verification} accent />
              {typeof briefing.confidence === 'number' && <p className="px-5 py-3 text-xs text-zinc-500">Retrieval confidence <span className="text-emerald-200">{briefing.confidence}%</span></p>}
            </div>}
          </section>

          {briefing && (
            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-100">AI feedback</h2>
                <span className="text-xs text-zinc-500">{feedbackStatus === 'submitted' ? 'Submitted' : feedbackStatus === 'submitting' ? 'Submitting…' : 'Optional'}</span>
              </div>
              <p className="mt-3 text-sm text-zinc-400">Help the system improve by marking this recommendation as helpful or requesting a follow-up review.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr]">
                <select aria-label="Satisfaction score" value={satisfactionScore} onChange={(event) => setSatisfactionScore(Number(event.target.value))} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"><option value={5}>5 - Excellent</option><option value={4}>4 - Good</option><option value={3}>3 - Fair</option><option value={2}>2 - Poor</option><option value={1}>1 - Bad</option></select>
                <input value={feedbackComment} onChange={(event) => setFeedbackComment(event.target.value)} maxLength={1000} placeholder="Optional feedback comment" className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={feedbackStatus === 'submitting' || !lastRequestId} onClick={() => void handleSubmitFeedback(true, true)} className="rounded bg-emerald-500 px-3 py-2 text-xs font-medium text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50">Helpful</button>
                <button type="button" disabled={feedbackStatus === 'submitting' || !lastRequestId} onClick={() => void handleSubmitFeedback(false, false)} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 transition hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50">Needs review</button>
              </div>
              {feedbackMessage && <p className={`mt-3 text-sm ${feedbackStatus === 'error' ? 'text-rose-300' : 'text-emerald-200'}`}>{feedbackMessage}</p>}
            </section>
          )}

          <section className="border-l-2 border-emerald-400/70 bg-zinc-900/60 p-5"><h2 className="text-sm font-semibold text-zinc-100">Verification loop</h2><p className="mt-2 text-sm leading-5 text-zinc-400">Close the signal loop after applying the proposed resolution.</p><div className="mt-4 flex gap-2"><button disabled={!briefing} onClick={() => setVerification('passed')} className="inline-flex items-center gap-2 border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"><Check size={14} /> Worked</button><button disabled={!briefing} onClick={() => setVerification('retry')} className="inline-flex items-center gap-2 border border-zinc-700 px-3 py-2 text-xs text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"><RefreshCcw size={14} /> Still failing</button></div>{verification !== 'idle' && <p className={`mt-3 text-xs ${verification === 'passed' ? 'text-emerald-200' : 'text-amber-200'}`}>{verification === 'passed' ? 'Verification recorded — ready for user confirmation.' : 'Failure recorded — submit new evidence to generate an alternate route.'}</p>}</section>

          <section className="border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100">Trusted retrieval context</h2>
              <ArrowRight size={15} className="text-zinc-600" />
            </div>
            <div className="mt-3 space-y-3">
              {loadingKnowledge ? (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">Loading trusted knowledge…</div>
              ) : knowledge.length === 0 ? (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">No trusted documents available yet.</div>
              ) : knowledge.slice(0, 3).map((doc) => (
                <div key={doc.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex gap-2">
                    <FileText size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                    <p className="text-sm text-zinc-300">{doc.title}</p>
                  </div>
                  <p className="mt-1 pl-6 text-xs text-zinc-600">Source: {doc.source} · {new Date(doc.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500">
              <span className="flex items-center gap-1"><Image size={13} /> screenshots</span>
              <span>·</span>
              <span>PDFs</span>
              <span>·</span>
              <span>logs</span>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function BriefSection({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className="p-5"><p className={`text-[10px] font-medium uppercase tracking-[.18em] ${accent ? 'text-emerald-400' : 'text-zinc-600'}`}>{label}</p><p className="mt-2 text-sm leading-6 text-zinc-300">{value}</p></div>;
}
