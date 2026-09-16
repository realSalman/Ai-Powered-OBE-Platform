"use client";

import { useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login, user, isMock } = useAuth();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const handleGoogleLogin = async () => {
    if (isMock || !auth) {
      setError("Authentication is not configured. Please add your Firebase credentials to .env.local.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();

      // Send token to backend to verify role
      await login(token);
      router.replace('/dashboard');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError("Access Denied: Your email is not assigned to any role.");
        if (auth) {
          auth.signOut();
        }
      } else {
        setError(err.message || "Failed to log in.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-6 font-sans">
      <div className="max-w-md w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 rounded-none">
        <div className="mb-8">
          <h2 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-50 font-mono text-center">
            SIGN IN
          </h2>
        </div>

        {isMock && (
          <div className="border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 p-4 mb-6">
            <p className="text-xs font-mono font-bold text-amber-800 dark:text-amber-400 uppercase mb-1">
              Configuration Required
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed font-light">
              Firebase keys are missing in <code className="bg-amber-100 dark:bg-amber-950 px-1 py-0.5 font-mono text-[10px]">.env.local</code>. Please configure Firebase to enable Google Sign-In.
            </p>
          </div>
        )}

        {error && (
          <div className="border border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 p-4 mb-6">
            <p className="text-xs font-mono font-bold text-red-800 dark:text-red-400 uppercase mb-1">
              Error
            </p>
            <p className="text-[11px] text-red-700 dark:text-red-300 leading-relaxed font-light">
              {error}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading || isMock}
            className="w-full flex justify-center items-center py-2.5 px-4 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'SIGNING IN...' : 'CONTINUE WITH GOOGLE'}
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full flex justify-center items-center py-2.5 px-4 border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-600 dark:text-zinc-400 font-mono text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            RETURN TO HOME
          </button>
        </div>
      </div>
    </div>
  );
}
