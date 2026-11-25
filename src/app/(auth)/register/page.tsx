'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) { setError('Account created. Please sign in manually.'); }
      else { router.push('/dashboard'); router.refresh(); }
    } catch { setError('Something went wrong'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-xl font-display font-bold tracking-tighter text-neutral-900">Create account</h1>
          <p className="text-sm text-neutral-400 mt-1">Start sharing your event photos.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{error}</div>}
          <div>
            <label htmlFor="name" className="label">Full name</label>
            <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="Jane Smith" />
          </div>
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" placeholder="6 characters minimum" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Creating account...' : 'Create account'}</button>
          <p className="text-center text-xs text-neutral-400">
            Already have an account?{' '}
            <Link href="/login" className="text-neutral-900 hover:text-accent font-medium transition-colors duration-150">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
