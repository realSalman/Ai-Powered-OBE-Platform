"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else {
        // Scalable mapping for user roles to their dashboard endpoints
        const roleRoutes: Record<string, string> = {
          student: '/dashboard/student',
          faculty: '/dashboard/faculty',
          hod: '/dashboard/hod',
          supervisor: '/dashboard/supervisor',
          admin: '/dashboard/admin',
        };

        const roles = user.roles?.map((r: string) => r.trim().toLowerCase()) || [];
        
        let targetPath = '';
        if (roles.includes('admin')) targetPath = roleRoutes['admin'];
        else if (roles.includes('hod')) targetPath = roleRoutes['hod'];
        else if (roles.includes('supervisor')) targetPath = roleRoutes['supervisor'];
        else if (roles.includes('faculty')) targetPath = roleRoutes['faculty'];
        else if (roles.includes('student')) targetPath = roleRoutes['student'];

        if (targetPath) {
          router.replace(targetPath);
        } else {
          // If roles is undefined or not recognized, fall back or logout
          console.warn(`Unrecognized user roles: ${user.roles}`);
          router.replace('/login');
        }
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 font-sans">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-5 h-5 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent animate-spin rounded-full"></div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">loading workspace...</p>
      </div>
    </div>
  );
}
