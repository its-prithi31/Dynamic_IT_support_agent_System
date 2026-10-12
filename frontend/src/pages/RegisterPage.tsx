import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await register(name, email, password, 'Employee'); navigate('/dashboard'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Registration failed.'); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <h2 className="text-2xl font-semibold">Create your workspace account</h2>
        <p className="mt-2 text-sm text-slate-400">Join the secure support platform.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" placeholder="Full name" />
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" placeholder="Work email" />
          <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" placeholder="Password (at least 6 characters)" />
          <p className="text-xs text-slate-400">New accounts are created as Employees. An administrator assigns elevated roles.</p>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950">Register</button>
        </form>
        <p className="mt-4 text-sm text-slate-400">
          Already have an account? <Link to="/login" className="text-cyan-300">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
