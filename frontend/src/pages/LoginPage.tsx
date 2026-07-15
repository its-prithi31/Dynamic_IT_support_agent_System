import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await login(email, password); navigate('/dashboard'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Sign-in failed.'); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <h2 className="text-2xl font-semibold">Welcome back</h2>
        <p className="mt-2 text-sm text-slate-400">Sign in to access the AI support portal.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" placeholder="Password" />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950">Login</button>
        </form>
        <p className="mt-4 text-sm text-slate-400">
          New here? <Link to="/register" className="text-cyan-300">Create account</Link>
        </p>
      </div>
    </div>
  );
}
