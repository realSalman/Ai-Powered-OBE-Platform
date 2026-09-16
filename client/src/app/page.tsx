"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="font-mono font-bold tracking-tight text-lg">ATLAS_AI</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-8 py-20 flex flex-col justify-center">
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-light tracking-tight leading-tight max-w-2xl">
            AI powered OBE Dashboard Analytics.
          </h1>

          <div className="pt-4">
            {loading ? (
              <div className="inline-flex items-center space-x-2 text-xs font-mono text-zinc-400">
                <span className="w-3 h-3 border border-zinc-400 border-t-transparent animate-spin rounded-full"></span>
                <span>Initializing...</span>
              </div>
            ) : user ? (
              <Link
                href="/dashboard"
                className="inline-block bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-mono text-xs font-semibold px-6 py-3 border border-zinc-900 dark:border-zinc-100 transition-colors"
              >
                DASHBOARD &rarr;
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-block bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-mono text-xs font-semibold px-6 py-3 border border-zinc-900 dark:border-zinc-100 transition-colors"
              >
                SIGN IN &rarr;
              </Link>
            )}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-8 py-6 text-center md:text-left">

      </footer>
    </div>
  );
}
