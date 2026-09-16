"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAI } from '@/context/AIContext';
import AIChatPanel from './ai/AIChatPanel';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDrawerOpen, setIsDrawerOpen } = useAI();

  const getNavLinks = () => {
    const roles = user?.roles?.map((r: string) => r.trim().toLowerCase()) || [];
    const groups: { group: string; links: { label: string; href: string }[] }[] = [];

    if (roles.includes('admin') || roles.includes('superadmin')) {
      groups.push({
        group: 'USER MANAGEMENT',
        links: [{ label: 'CREATE NEW USER', href: '/dashboard/admin' }]
      });
      groups.push({
        group: 'ACADEMIC STRUCTURE',
        links: [
          { label: 'DEPARTMENTS', href: '/dashboard/admin/departments' },
          { label: 'PROGRAMS', href: '/dashboard/admin/programs' },
          { label: 'SEMESTERS', href: '/dashboard/admin/semesters' },
          { label: 'BATCHES', href: '/dashboard/admin/batches' },
        ]
      });
      groups.push({
        group: 'COURSE MANAGEMENT',
        links: [
          { label: 'COURSES', href: '/dashboard/admin/courses' },
          { label: 'COURSE OFFERINGS', href: '/dashboard/admin/offerings' },
          { label: 'SECTION ASSIGNMENTS', href: '/dashboard/admin/sections' },
        ]
      });
      groups.push({
        group: 'STUDENT RECORDS',
        links: [
          { label: 'STUDENT ENROLLMENTS', href: '/dashboard/admin/enrollments' },
          { label: 'OBE ANALYTICS', href: '/dashboard/admin/analytics' },
          { label: 'AI ASSISTANT', href: '/dashboard/admin/ai' }
        ]
      });
    }

    if (roles.includes('hod')) {
      groups.push({
        group: 'HOD PORTAL',
        links: [
          { label: 'DASHBOARD', href: '/dashboard/hod' },
          { label: 'PROGRAMS', href: '/dashboard/hod/programs' },
          { label: 'COURSES', href: '/dashboard/hod/courses' },
          { label: 'COURSE OFFERINGS', href: '/dashboard/hod/offerings' },
          { label: 'EXAM OVERVIEW', href: '/dashboard/hod/exams' },
          { label: 'OBE ANALYTICS', href: '/dashboard/hod/analytics' },
          { label: 'AI ASSISTANT', href: '/dashboard/hod/ai' }
        ]
      });
    }

    if (roles.includes('supervisor')) {
      groups.push({
        group: 'SUPERVISOR PORTAL',
        links: [
          { label: 'DASHBOARD', href: '/dashboard/supervisor' },
          { label: 'SECTION ASSIGNMENTS', href: '/dashboard/supervisor/sections' },
          { label: 'STUDENT ENROLLMENTS', href: '/dashboard/supervisor/enrollments' },
          { label: 'AI ASSISTANT', href: '/dashboard/supervisor/ai' }
        ]
      });
    }

    if (roles.includes('faculty')) {
      groups.push({
        group: 'FACULTY PORTAL',
        links: [
          { label: 'DASHBOARD', href: '/dashboard/faculty' },
          { label: 'MY EXAMS', href: '/dashboard/faculty/exams' },
          { label: 'OBE ANALYTICS', href: '/dashboard/faculty/analytics' },
          { label: 'AI ASSISTANT', href: '/dashboard/faculty/ai' }
        ]
      });
    }

    if (roles.includes('student')) {
      groups.push({
        group: 'STUDENT PORTAL',
        links: [
          { label: 'DASHBOARD', href: '/dashboard/student' },
          { label: 'MY GRADES', href: '/dashboard/student/marks' },
          { label: 'PERFORMANCE INSIGHTS', href: '/dashboard/student/insights' },
          { label: 'AI ASSISTANT', href: '/dashboard/student/ai' }
        ]
      });
    }

    return groups;
  };

  const navGroups = getNavLinks();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col md:flex-row bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
      {/* Sidebar for Desktop */}
      <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hidden md:flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 relative z-30 shadow-md bg-white dark:bg-zinc-900">
          <Link href="/dashboard" className="font-mono font-bold tracking-tight text-base hover:opacity-80 transition-opacity">
            ATLAS_AI
          </Link>
        </div>

        <nav className="flex-1 py-6 overflow-y-auto scrollbar-hide space-y-6">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              <h3 className="px-6 text-[10px] font-mono font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                {group.group}
              </h3>
              {group.links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block py-2 px-6 text-xs font-mono border-l-2 transition-all ${isActive
                      ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-50 bg-zinc-50 dark:bg-zinc-800/40 font-semibold'
                      : 'border-transparent text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
                      }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Card at Sidebar Bottom */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 space-y-3 relative z-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)]">
          <div className="space-y-1">
            <p className="text-[10px] text-zinc-400 truncate font-mono">{user?.email}</p>
            <span className="inline-block mt-1 px-1.5 py-0.5 border border-zinc-300 dark:border-zinc-700 text-[9px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {user?.roles?.join(', ') || 'no-role'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left py-1.5 px-3 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-100 font-mono text-[10px] tracking-tight hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-colors cursor-pointer"
          >
            SIGN OUT
          </button>
        </div>
      </aside>

      {/* Top Header for Mobile */}
      <header className="md:hidden border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 flex justify-between items-center">
        <Link href="/dashboard" className="font-mono font-bold tracking-tight text-sm">
          ATLAS_AI
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 border border-zinc-200 dark:border-zinc-800 text-xs font-mono px-2 py-1"
        >
          {mobileMenuOpen ? 'CLOSE' : 'MENU'}
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 space-y-4">
          <nav className="flex flex-col space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
            {navGroups.map((group) => (
              <div key={group.group} className="space-y-1">
                <h3 className="text-[10px] font-mono font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
                  {group.group}
                </h3>
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block py-1.5 text-xs font-mono ${pathname === link.href
                      ? 'text-zinc-950 dark:text-zinc-50 font-bold'
                      : 'text-zinc-500'
                      }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            <div className="text-[10px] font-mono">
              <span className="capitalize">{user?.name}</span> ({user?.roles?.join(', ')})
            </div>
            <button
              onClick={handleLogout}
              className="px-2 py-1 border border-zinc-200 dark:border-zinc-800 font-mono text-[9px] hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-colors"
            >
              SIGN OUT
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto scrollbar-hide">
        <main className="flex-1 p-6 md:p-10 max-w-5xl w-full mx-auto">
          {/* Section Header */}
          <div className="mb-8 flex justify-between items-center pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <h1 className="text-xl font-medium tracking-tight uppercase font-mono">{title}</h1>
              {user?.department && (
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-wider mt-0.5">
                  DEPT: {user.department}
                </p>
              )}
            </div>
            
            {user && (
              <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 text-[10px] font-mono uppercase tracking-wider hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors flex items-center gap-1.5 cursor-pointer text-zinc-700 dark:text-zinc-300"
              >
                ✦ ATLAS AI
              </button>
            )}
          </div>

          {/* Child content */}
          <div className="space-y-6">
            {children}
          </div>
        </main>
      </div>
      {isDrawerOpen && <AIChatPanel onClose={() => setIsDrawerOpen(false)} />}
    </div>
  );
}
