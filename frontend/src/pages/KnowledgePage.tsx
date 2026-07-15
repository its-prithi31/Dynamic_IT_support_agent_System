import { Database, FileSearch, LockKeyhole, UploadCloud } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchKnowledge } from '../services/api';

export default function KnowledgePage() {
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(true);

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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Multimodal RAG</p>
        <h1 className="mt-2 text-3xl font-semibold">Trusted knowledge base</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">Frontend for previous solved tickets, IT manuals, PDFs, screenshots, error logs, and troubleshooting documents used by the retrieval pipeline.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['Documents', '126', Database],
          ['Vector chunks', '18.4k', FileSearch],
          ['Verified sources', '94%', LockKeyhole],
          ['New uploads', '12', UploadCloud],
        ].map(([label, value, Icon]) => (
          <div key={label as string} className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <Icon size={20} className="text-emerald-300" />
            <p className="mt-3 text-2xl font-semibold">{value as string}</p>
            <p className="text-sm text-zinc-400">{label as string}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold">Ingestion pipeline</h2>
          <div className="mt-5 space-y-3">
            {['File upload', 'Text extraction and OCR', 'Data masking', 'Embedding generation', 'FAISS/Chroma indexing', 'Trusted retrieval'].map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/15 text-sm text-emerald-200">{index + 1}</span>
                <span className="text-sm text-zinc-300">{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold">Knowledge sources</h2>
          <div className="mt-4 space-y-3">
            {loadingKnowledge ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">Loading knowledge base…</div>
            ) : knowledge.length === 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">No knowledge documents found.</div>
            ) : knowledge.map((doc) => (
              <div key={doc.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{doc.title}</p>
                    <p className="mt-1 text-sm text-zinc-500">Source: {doc.source} · {new Date(doc.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">Verified</span>
                </div>
                <div className="mt-3 text-sm leading-6 text-zinc-400">{doc.content?.slice(0, 240)}{doc.content && doc.content.length > 240 ? '…' : ''}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
