import { Link } from 'react-router-dom';
import { ArrowRight, Bot, ShieldCheck, Cpu, Layers3 } from 'lucide-react';
import { motion } from 'framer-motion';

const highlights = [
  { title: 'Multimodal RAG', text: 'Blend text, image, logs and docs to retrieve verified solutions.' },
  { title: 'Secure Recovery', text: 'Guide users safely through official password and sign-in recovery paths.' },
  { title: 'Offline Ready', text: 'Continue with local AI support when connectivity is interrupted.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.2),_transparent_35%)] px-6 py-16 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-16">
        <header className="flex flex-wrap items-center justify-between rounded-3xl border border-slate-800 bg-slate-900/70 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-500/20 p-3 text-cyan-300">
              <Bot size={20} />
            </div>
            <div>
              <p className="text-lg font-semibold">Aegis IT Support</p>
              <p className="text-sm text-slate-400">Autonomous enterprise support assistant</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to="/login" className="rounded-xl border border-slate-700 px-4 py-2 text-sm">Login</Link>
            <Link to="/register" className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950">Get Started</Link>
          </div>
        </header>

        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <p className="mb-4 inline-flex rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
              AI-powered autonomous IT support
            </p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Secure, intelligent help for every employee and IT team.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-slate-300">
              Handle tickets, troubleshoot issues, analyze screenshots and logs, and recover sign-in problems with a trusted multimodal AI workflow.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/support" className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-medium text-slate-950">
                Open support hub <ArrowRight size={18} />
              </Link>
              <Link to="/dashboard" className="rounded-xl border border-slate-700 px-5 py-3 font-medium text-slate-100">
                View admin dashboard
              </Link>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <ShieldCheck className="text-cyan-300" />
                <p className="mt-3 font-semibold">Secure by design</p>
                <p className="mt-2 text-sm text-slate-400">No password or OTP storage, human approval for critical actions.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <Cpu className="text-cyan-300" />
                <p className="mt-3 font-semibold">Hybrid AI</p>
                <p className="mt-2 text-sm text-slate-400">Cloud intelligence with offline fallback for everyday support.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:col-span-2">
                <Layers3 className="text-cyan-300" />
                <p className="mt-3 font-semibold">Multimodal workflow</p>
                <p className="mt-2 text-sm text-slate-400">Text, screenshots, logs and documents are analyzed together with trusted knowledge retrieval.</p>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <p className="font-semibold">{item.title}</p>
              <p className="mt-2 text-sm text-slate-400">{item.text}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
