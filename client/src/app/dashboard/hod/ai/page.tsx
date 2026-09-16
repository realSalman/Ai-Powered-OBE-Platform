"use client";

import React, { useEffect, useState } from 'react';
import RoleGuard from "@/components/RoleGuard";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useAI } from "@/context/AIContext";
import { apiGet } from "@/lib/api";
import { IBatch, ISemester } from "@/types/api";
import AIKeySetup from "@/components/ai/AIKeySetup";
import AIInsightCards from "@/components/ai/AIInsightCards";

export default function HODAIPage() {
  const { user } = useAuth();
  const { hasApiKey, setActiveRole } = useAI();
  const [batches, setBatches] = useState<IBatch[]>([]);
  const [semesters, setSemesters] = useState<ISemester[]>([]);
  
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'department' | 'batch'>('department');

  useEffect(() => {
    setActiveRole('hod');
  }, [setActiveRole]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [batchesRes, semestersRes] = await Promise.all([
          apiGet<IBatch[]>('/batches', { limit: 100 }),
          apiGet<ISemester[]>('/semesters', { limit: 100 })
        ]);
        
        const batchList = batchesRes.data || [];
        setBatches(batchList);
        if (batchList.length > 0) {
          setSelectedBatchId(batchList[0]._id);
        }

        const semList = semestersRes.data || [];
        setSemesters(semList);
        if (semList.length > 0) {
          setSelectedSemesterId(semList[0]._id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load batches and semesters.');
      } finally {
        setLoading(false);
      }
    };

    if (hasApiKey && user?.department) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [hasApiKey, user]);

  return (
    <RoleGuard allowedRoles={["hod"]}>
      <DashboardLayout title="Department AI Assistant">
        <div className="space-y-6">
          {!hasApiKey ? (
            <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-6">
              <div className="text-center max-w-md mx-auto space-y-2 py-4">
                <span className="text-3xl font-mono text-zinc-400">✦</span>
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-50">
                  Welcome to Atlas AI
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans">
                  Atlas AI helps department heads monitor batch-level performance, run cross-course attainment audits, and identify systemic learning outcomes issues. To get started, configure your API key.
                </p>
              </div>
              <AIKeySetup />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Panel with Sub-tabs */}
              <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-mono font-bold uppercase tracking-tight text-zinc-850 dark:text-zinc-200">
                    Departmental Attainment Analytics
                  </h2>
                  <div className="flex border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono font-bold">
                    <button
                      onClick={() => setActiveTab('department')}
                      className={`px-3 py-1 cursor-pointer uppercase ${
                        activeTab === 'department' 
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' 
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-350'
                      }`}
                    >
                      Department Scope
                    </button>
                    <button
                      onClick={() => setActiveTab('batch')}
                      className={`px-3 py-1 border-l border-zinc-200 dark:border-zinc-800 cursor-pointer uppercase ${
                        activeTab === 'batch' 
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' 
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-350'
                      }`}
                    >
                      Batch Scope
                    </button>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-2xl font-sans">
                  Analyze strategic program outcome levels or deep-dive into batch and semester attainment mapping. Toggle the chat box in the header to ask specific queries.
                </p>

                {error && (
                  <div className="p-3 border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-mono">
                    {error}
                  </div>
                )}

                {activeTab === 'batch' && !loading && (
                  <div className="flex flex-col md:flex-row gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 shrink-0">
                        Batch:
                      </label>
                      <select
                        value={selectedBatchId}
                        onChange={(e) => setSelectedBatchId(e.target.value)}
                        className="px-2 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono text-xs uppercase font-semibold focus:outline-none cursor-pointer"
                      >
                        {batches.map((b) => (
                          <option key={b._id} value={b._id}>
                            {b.name} ({b.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 shrink-0">
                        Semester:
                      </label>
                      <select
                        value={selectedSemesterId}
                        onChange={(e) => setSelectedSemesterId(e.target.value)}
                        className="px-2 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono text-xs uppercase font-semibold focus:outline-none cursor-pointer"
                      >
                        {semesters.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {activeTab === 'department' && user?.department && (
                <AIInsightCards scopeId={user.department} scopeType="department" semesterId={selectedSemesterId} />
              )}

              {activeTab === 'batch' && selectedBatchId && (
                <AIInsightCards scopeId={selectedBatchId} scopeType="batch" semesterId={selectedSemesterId} />
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
}
