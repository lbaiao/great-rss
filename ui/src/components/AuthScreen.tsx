import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../supabase';

type AuthMode = 'sign-in' | 'sign-up';

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'sign-up';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const credentials = {
      email: email.trim(),
      password,
    };

    try {
      const { data, error: authError } = isSignUp
        ? await supabase.auth.signUp(credentials)
        : await supabase.auth.signInWithPassword(credentials);

      if (authError) {
        throw authError;
      }

      if (isSignUp && !data.session) {
        setError('Confirm email is still enabled in this Supabase project. Disable it in Authentication > Sign In / Providers > Email, then try signing up again.');
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 md:px-margin-desktop flex items-center justify-center">
      <section className="w-full max-w-5xl grid gap-8 lg:grid-cols-[1.05fr_0.95fr] items-stretch">
        <div className="border border-black bg-primary text-white brutalist-shadow p-8 md:p-10 flex flex-col justify-between min-h-[460px]">
          <div>
            <p className="text-label-sm text-white/80 mb-4">Private Signal Desk</p>
            <h1 className="text-[56px] md:text-[84px] font-black uppercase leading-[0.82]">
              Great RSS
            </h1>
          </div>
          <div className="mt-12 border-t border-white/50 pt-6">
            <p className="text-body-lg max-w-xl">
              Your feeds, reading history, and archive stay attached to your account.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="border border-black bg-white brutalist-shadow p-6 md:p-8">
          <div className="flex items-center justify-between gap-4 border-b border-black pb-5 mb-8">
            <div>
              <p className="text-label-sm text-primary mb-2">Authentication</p>
              <h2 className="text-headline-md">{isSignUp ? 'Create account' : 'Sign in'}</h2>
            </div>
            <button
              type="button"
              className="border border-black px-3 py-2 text-label-sm hover:bg-black hover:text-white transition-colors"
              onClick={() => {
                setMode(isSignUp ? 'sign-in' : 'sign-up');
                setError(null);
                setMessage(null);
              }}
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </div>

          <label className="block mb-5">
            <span className="text-label-sm block mb-2">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              required
              className="w-full border border-black bg-background px-4 py-3 text-body-md font-bold focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="you@example.com"
            />
          </label>

          <label className="block mb-6">
            <span className="text-label-sm block mb-2">Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={6}
              required
              className="w-full border border-black bg-background px-4 py-3 text-body-md font-bold focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="At least 6 characters"
            />
          </label>

          {error ? (
            <div className="mb-5 border border-primary bg-primary/10 px-4 py-3 text-sm font-bold text-primary">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="mb-5 border border-black bg-background px-4 py-3 text-sm font-bold">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full border border-black bg-black text-white px-5 py-4 text-label-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {isSignUp ? 'Create account' : 'Enter app'}
          </button>
        </form>
      </section>
    </main>
  );
};
