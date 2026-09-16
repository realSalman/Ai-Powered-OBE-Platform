"use client";

import React, { useEffect, useState } from 'react';
import RoleGuard from "@/components/RoleGuard";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useAI } from "@/context/AIContext";
import { apiGet } from "@/lib/api";
import { IDepartment, IBatch, ISemester } from "@/types/api";
import AIKeySetup from "@/components/ai/AIKeySetup";
import AIInsightCards from "@/components/ai/AIInsightCards";

export default function AdminAIPage() {
  const { user } = useAuth();
  const { hasApiKey, setActiveRole } = useAI();

  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [batches, setBatches] = useState<IBatch[]>([]);
  const [semesters, setSemesters] = useState<ISemester[]>([]);

  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'department' | 'batch'>('department');

  const isSuperAdmin = user?.roles?.includes('superadmin');

  useEffect(() => {
    setActiveRole(isSuperAdmin ? 'superadmin' : 'admin');
  }, [setActiveRole, isSuperAdmin]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isSuperAdmin) {
          const [deptsRes, semestersRes] = await Promise.all([
            apiGet<IDepartment[]>('/departments', { limit: 100 }),
            apiGet<ISemester[]>('/semesters', { limit: 100 })
          ]);

          const deptList = deptsRes.data || [];
          setDepartments(deptList);
          if (deptList.length > 0) {
            setSelectedDeptId(deptList[0]._id);
          }

          const semList = semestersRes.data || [];
          setSemesters(semList);
          if (semList.length > 0) {
            setSelectedSemesterId(semList[0]._id);
          }
        } else {
          // Regular admin
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
          if (user?.department) {
            setSelectedDeptId(user.department);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load initial workspace data.');
      } finally {
        setLoading(false);
      }
    };

    if (hasApiKey) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [hasApiKey, isSuperAdmin, user]);

  // Load batches for selected department (for superadmin only)
  useEffect(() => {
    const fetchDeptBatches = async () => {
      if (!isSuperAdmin || !selectedDeptId) return;
      try {
        const res = await apiGet<IBatch[]>('/batches', { department: selectedDeptId, limit: 100 });
        const list = res.data || [];
        setBatches(list);
        if (list.length > 0) {
          setSelectedBatchId(list[0]._id);
        } else {
          setSelectedBatchId('');
        }
      } catch (e) {
        console.error('Failed to load batches for selected department', e);
      }
    };
    fetchDeptBatches();
  }, [selectedDeptId, isSuperAdmin]);

  const activeScopeId = activeTab === 'department' ? selectedDeptId : selectedBatchId;
  const activeScopeType = activeTab === 'department' ? 'department' : 'batch';

  return (
    <RoleGuard allowedRoles={["admin", "superadmin"]}>
      <DashboardLayout title={isSuperAdmin ? "Superadmin AI Workspace" : "Admin AI Workspace"}>
        <div className="space-y-6">
          {!hasApiKey ? (
            <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-6">
              <div className="text-center max-w-md mx-auto space-y-2 py-4">
                <span className="text-3xl font-mono text-zinc-400">✦</span>
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-50">
                  Welcome to Atlas AI
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans">
                  Atlas AI enables institution-level PO/CO tracking, departmental comparisons, and strategic curriculum audits. To begin, configure your API key.
                </p>
              </div>
              <AIKeySetup />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Scope Selection Panel */}
              <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-mono font-bold uppercase tracking-tight text-zinc-850 dark:text-zinc-200">
                    Institutional Attainment Analytics
                  </h2>
                  <div className="flex border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono font-bold">
                    <button
                      onClick={() => setActiveTab('department')}
                      className={`px-3 py-1 cursor-pointer uppercase ${activeTab === 'department'
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-350'
                        }`}
                    >
                      Department Scope
                    </button>
                    <button
                      onClick={() => setActiveTab('batch')}
                      className={`px-3 py-1 border-l border-zinc-200 dark:border-zinc-800 cursor-pointer uppercase ${activeTab === 'batch'
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-350'
                        }`}
                    >
                      Batch Scope
                    </button>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-2xl font-sans">
                  {isSuperAdmin
                    ? "As a superadmin, you have full cross-department analysis privileges. Select a target department or batch below to proceed."
                    : "As a department admin, your insights are restricted to your department scope."}
                </p>

                {error && (
                  <div className="p-3 border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-mono">
                    {error}
                  </div>
                )}

                {!loading && (
                  <div className="flex flex-col md:flex-row gap-4 pt-2">
                    {isSuperAdmin && activeTab === 'department' && (
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 shrink-0">
                          Department:
                        </label>
                        <select
                          value={selectedDeptId}
                          onChange={(e) => setSelectedDeptId(e.target.value)}
                          className="px-2 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono text-xs uppercase font-semibold focus:outline-none cursor-pointer"
                        >
                          {departments.map((d) => (
                            <option key={d._id} value={d._id}>
                              {d.name} ({d.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {activeTab === 'batch' && (
                      <>
                        {isSuperAdmin && (
                          <div className="flex items-center gap-2">
                            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 shrink-0">
                              Dept Filter:
                            </label>
                            <select
                              value={selectedDeptId}
                              onChange={(e) => setSelectedDeptId(e.target.value)}
                              className="px-2 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono text-xs uppercase font-semibold focus:outline-none cursor-pointer"
                            >
                              {departments.map((d) => (
                                <option key={d._id} value={d._id}>
                                  {d.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 shrink-0">
                            Batch:
                          </label>
                          <select
                            value={selectedBatchId}
                            onChange={(e) => setSelectedBatchId(e.target.value)}
                            disabled={batches.length === 0}
                            className="px-2 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono text-xs uppercase font-semibold focus:outline-none cursor-pointer"
                          >
                            {batches.length === 0 ? (
                              <option>No Batches Available</option>
                            ) : (
                              batches.map((b) => (
                                <option key={b._id} value={b._id}>
                                  {b.name} ({b.code})
                                </option>
                              ))
                            )}
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
                      </>
                    )}
                  </div>
                )}
              </div>

              {activeScopeId && (
                <AIInsightCards scopeId={activeScopeId} scopeType={activeScopeType} semesterId={selectedSemesterId} />
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
}
