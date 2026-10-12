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
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign-in failed.');
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    try {
      await login(demoEmail, demoPass);
      navigate('/dashboard');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign-in failed.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <h2 className="text-2xl font-semibold">Welcome back</h2>
        <p className="mt-2 text-sm text-slate-400">Sign in to access the AI support portal.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
            placeholder="Email address"
          />
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
            placeholder="Password"
          />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button type="submit" className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 hover:opacity-90">
            Login
          </button>
        </form>

        <div className="mt-6 border-t border-slate-800 pt-4">
          <p className="text-xs font-medium text-slate-400">Quick Demo Access:</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('priya@aegis.corp', 'priya123')}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white"
            >
              Employee
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('tech@aegis.corp', 'tech123')}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white"
            >
              IT Tech
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@aegis.corp', 'admin123')}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white"
            >
              Admin
            </button>
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-400">
          New here? <Link to="/register" className="text-cyan-300 hover:underline">Create account</Link>
        </p>
      </div>
    </div>
  );
}
