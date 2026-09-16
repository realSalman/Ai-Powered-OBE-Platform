"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else {
        const normalizedUserRoles = user.roles?.map((r: string) => r.trim().toLowerCase()) || [];
        const normalizedAllowedRoles = allowedRoles.map((r: string) => r.trim().toLowerCase());
        if (!normalizedAllowedRoles.some(r => normalizedUserRoles.includes(r))) {
          // Redirect back to dashboard gateway (which routes them to their correct home page)
          router.replace('/dashboard');
        }
      }
    }
  }, [user, loading, router, allowedRoles]);

  const normalizedUserRoles = user?.roles?.map((r: string) => r.trim().toLowerCase()) || [];
  const normalizedAllowedRoles = allowedRoles.map((r: string) => r.trim().toLowerCase());
  if (loading || !user || !normalizedAllowedRoles.some(r => normalizedUserRoles.includes(r))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 font-sans">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-5 h-5 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent animate-spin rounded-full"></div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">verifying access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
