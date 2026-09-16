"use client";

import React, { useEffect, useState } from 'react';
import RoleGuard from "@/components/RoleGuard";
import DashboardLayout from "@/components/DashboardLayout";
import { useAI } from "@/context/AIContext";
import { apiGet } from "@/lib/api";
import { ICourseOffering } from "@/types/api";
import AIKeySetup from "@/components/ai/AIKeySetup";
import AIInsightCards from "@/components/ai/AIInsightCards";

export default function FacultyAIPage() {
  const { hasApiKey, setActiveRole } = useAI();
  const [offerings, setOfferings] = useState<ICourseOffering[]>([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveRole('faculty');
  }, [setActiveRole]);

  useEffect(() => {
    const fetchOfferings = async () => {
      try {
        const res = await apiGet<ICourseOffering[]>('/offerings/me', { limit: 100 });
        const list = res.data || [];
        setOfferings(list);
        if (list.length > 0) {
          setSelectedOfferingId(list[0]._id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch course offerings.');
      } finally {
        setLoading(false);
      }
    };

    if (hasApiKey) {
      fetchOfferings();
    } else {
      setLoading(false);
    }
  }, [hasApiKey]);

  return (
    <RoleGuard allowedRoles={["faculty"]}>
      <DashboardLayout title="AI">
        <div className="space-y-6">
          {!hasApiKey ? (
            <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-6">
              <div className="text-center max-w-md mx-auto space-y-2 py-4">
                <span className="text-3xl font-mono text-zinc-400">✦</span>
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-50">
                  Welcome to Atlas AI
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans">
                  Atlas AI acts as a teaching assistant. It identifies at-risk students, runs class-level root-cause analysis, and recommends pedagogical adjustments. To get started, configure your API key.
                </p>
              </div>
              <AIKeySetup />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-4">
                <h2 className="text-sm font-mono font-bold uppercase tracking-tight text-zinc-850 dark:text-zinc-200">
                  Classroom Analytics Assistant
                </h2>

                {error && (
                  <div className="p-3 border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-mono">
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="text-xs font-mono text-zinc-500">Loading your offerings...</div>
                ) : offerings.length === 0 ? (
                  <div className="text-xs font-mono text-zinc-500">
                    No active course offerings found. Assign courses to your profile before running AI analysis.
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row md:items-center gap-3 pt-2">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 shrink-0">
                      Select offering:
                    </label>
                    <select
                      value={selectedOfferingId}
                      onChange={(e) => setSelectedOfferingId(e.target.value)}
                      className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono text-xs uppercase font-semibold focus:outline-none cursor-pointer max-w-md"
                    >
                      {offerings.map((off) => (
                        <option key={off._id} value={off._id}>
                          {off.courseCode} ({off.section}) — {off.semesterName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {selectedOfferingId && (
                <AIInsightCards scopeId={selectedOfferingId} scopeType="offering" />
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
}
