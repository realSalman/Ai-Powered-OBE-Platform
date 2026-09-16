"use client";

import React, { useEffect } from 'react';
import RoleGuard from "@/components/RoleGuard";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useAI } from "@/context/AIContext";
import AIKeySetup from "@/components/ai/AIKeySetup";
import AIInsightCards from "@/components/ai/AIInsightCards";

export default function StudentAIPage() {
  const { user } = useAuth();
  const { hasApiKey, setActiveRole } = useAI();

  useEffect(() => {
    setActiveRole('student');
  }, [setActiveRole]);

  return (
    <RoleGuard allowedRoles={["student"]}>
      <DashboardLayout title="AI Academic Assistant">
        <div className="space-y-6">
          {!hasApiKey ? (
            <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-6">
              <div className="text-center max-w-md mx-auto space-y-2 py-4">
                <span className="text-3xl font-mono text-zinc-400">✦</span>
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-50">
                  Welcome to Atlas AI
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans">
                  Atlas AI provides personalized study recommendations, career alignment plans, and deep insights into your course outcome attainment. To start, configure your OpenRouter API key.
                </p>
              </div>
              <AIKeySetup />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-4">
                <h2 className="text-sm font-mono font-bold uppercase tracking-tight text-zinc-800 dark:text-zinc-200">
                  Academic Insights Assistant
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-2xl font-sans">
                  Select one of the analysis blocks below to evaluate your academic attainment. You can also click the <span className="font-bold text-zinc-850 dark:text-zinc-100">✦ ATLAS AI</span> button in the header at any time to open the chat panel.
                </p>
              </div>

              {user && (
                <AIInsightCards scopeId={user._id} scopeType="student" />
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
}
