"use client";

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import RoleGuard from '@/components/RoleGuard';
import { useToast } from '@/components/ui/Toast';
import { apiGet, apiPut } from '@/lib/api';
import { IDepartment, IBatch, ISemester, IAttainmentConfig } from '@/types/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Layers, RefreshCw, BarChart2, PieChart, Settings, AlertTriangle } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const { showToast } = useToast();

  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [selectedDept, setSelectedDept] = useState<IDepartment | null>(null);
  
  const [semesters, setSemesters] = useState<ISemester[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<ISemester | null>(null);

  const [batches, setBatches] = useState<IBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<IBatch | null>(null);

  const [loading, setLoading] = useState(true);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // Cross-department PO comparison data
  const [comparisonData, setComparisonData] = useState<any[]>([]);

  // Batch PO attainment data
  const [batchPOData, setBatchPOData] = useState<any[]>([]);

  // Configuration Sliders State
  const [config, setConfig] = useState<IAttainmentConfig | null>(null);
  const [studentPass, setStudentPass] = useState<number>(0);
  const [lvl3, setLvl3] = useState<number>(0);
  const [lvl2, setLvl2] = useState<number>(0);
  const [lvl1, setLvl1] = useState<number>(0);
  const [isConfigChanged, setIsConfigChanged] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Fetch initial base dependency lists
  const fetchBaseData = async () => {
    setLoading(true);
    try {
      const [deptRes, semRes] = await Promise.all([
        apiGet<IDepartment[]>('/departments', { limit: 50 }),
        apiGet<ISemester[]>('/semesters', { limit: 50 }),
      ]);

      const deptList = deptRes.data || [];
      const semList = semRes.data || [];
      setDepartments(deptList);
      setSemesters(semList);

      if (deptList.length > 0) setSelectedDept(deptList[0]);
      
      const activeSem = semList.find(s => s.status === 'active') || semList[0] || null;
      setSelectedSemester(activeSem);

    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to initialize dashboard dependencies', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBaseData();
  }, []);

  // Fetch batches when department changes
  useEffect(() => {
    if (!selectedDept) return;
    
    const fetchBatches = async () => {
      try {
        const res = await apiGet<IBatch[]>('/batches', {
          department: selectedDept._id,
          limit: 100,
        });
        const batchList = res.data || [];
        setBatches(batchList);
        if (batchList.length > 0) {
          setSelectedBatch(batchList[0]);
        } else {
          setSelectedBatch(null);
          setBatchPOData([]);
        }
      } catch (err) {
        console.error('Failed to fetch department batches', err);
      }
    };
    
    fetchBatches();
  }, [selectedDept]);

  const fetchConfig = async (deptId: string) => {
    try {
      const configRes = await apiGet<IAttainmentConfig>('/attainment/config', { department: deptId });
      const cfg = configRes.data;
      setConfig(cfg);
      if (cfg) {
        setStudentPass(cfg.studentPassThreshold);
        setLvl3(cfg.level3Threshold);
        setLvl2(cfg.level2Threshold);
        setLvl1(cfg.level1Threshold);
        setIsConfigChanged(false);
      } else {
        setConfig(null);
        setStudentPass(0);
        setLvl3(0);
        setLvl2(0);
        setLvl1(0);
        setIsConfigChanged(false);
      }
    } catch (err: any) {
      if (err.response?.data?.code === 'CONFIG_REQUIRED') {
        setConfig(null);
        setStudentPass(0);
        setLvl3(0);
        setLvl2(0);
        setLvl1(0);
        setIsConfigChanged(false);
      } else {
        showToast(err.response?.data?.message || 'Failed to fetch thresholds config', 'error');
      }
    }
  };

  useEffect(() => {
    if (!selectedDept) return;
    fetchConfig(selectedDept._id);
  }, [selectedDept]);

  // Sliders Change Handlers (with Level 3 > Level 2 > Level 1 constraint enforcement)
  const handleStudentPassChange = (val: number) => {
    setStudentPass(val);
    setIsConfigChanged(true);
  };

  const handleLvl3Change = (val: number) => {
    setLvl3(val);
    if (val <= lvl2) {
      setLvl2(Math.max(0, val - 1));
    }
    if (val <= lvl1) {
      setLvl1(Math.max(0, val - 2));
    }
    setIsConfigChanged(true);
  };

  const handleLvl2Change = (val: number) => {
    setLvl2(val);
    if (val >= lvl3) {
      setLvl3(Math.min(100, val + 1));
    }
    if (val <= lvl1) {
      setLvl1(Math.max(0, val - 1));
    }
    setIsConfigChanged(true);
  };

  const handleLvl1Change = (val: number) => {
    setLvl1(val);
    if (val >= lvl2) {
      setLvl2(Math.min(100, val + 1));
    }
    if (val >= lvl3) {
      setLvl3(Math.min(100, val + 2));
    }
    setIsConfigChanged(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedDept) return;
    if (lvl3 <= lvl2 || lvl2 <= lvl1) {
      showToast('Validation failed: Level 3 > Level 2 > Level 1 threshold constraint violated', 'error');
      return;
    }

    setSavingConfig(true);
    try {
      await apiPut('/attainment/config', {
        department: selectedDept._id,
        studentPassThreshold: studentPass,
        level3Threshold: lvl3,
        level2Threshold: lvl2,
        level1Threshold: lvl1,
      });
      showToast('Department attainment thresholds saved successfully', 'success');
      await fetchConfig(selectedDept._id);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save configuration', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // Compute Cross-Department Comparison when semester changes
  useEffect(() => {
    if (departments.length === 0 || !selectedSemester) return;

    const fetchCrossDeptComparison = async () => {
      setComparisonLoading(true);
      const semId = selectedSemester._id;

      try {
        const results = await Promise.all(
          departments.map(async (dept) => {
            try {
              const res = await apiGet<any>(`/attainment/department/${dept._id}/${semId}`);
              return {
                deptCode: dept.code,
                poAttainments: res.data?.poAttainments || [],
              };
            } catch (err) {
              return { deptCode: dept.code, poAttainments: [] };
            }
          })
        );

        // Pivot data for Recharts: [{ po: "PO1", CSE: 1.5, EEE: 2.1 }]
        const poCodes = new Set<string>();
        results.forEach((r) => {
          r.poAttainments.forEach((po: any) => poCodes.add(po.po));
        });

        const chartData = Array.from(poCodes).map((poCode) => {
          const item: any = { po: poCode };
          results.forEach((r) => {
            const poObj = r.poAttainments.find((po: any) => po.po === poCode);
            item[r.deptCode] = poObj ? Number(poObj.attainmentScore.toFixed(2)) : 0;
          });
          return item;
        });

        setComparisonData(chartData);

      } catch (err: any) {
        showToast('Failed to compile comparison data', 'error');
      } finally {
        setComparisonLoading(false);
      }
    };

    fetchCrossDeptComparison();
  }, [departments, selectedSemester]);

  // Fetch Batch Drill-Down when selected batch or semester changes
  useEffect(() => {
    if (!selectedBatch || !selectedSemester) {
      setBatchPOData([]);
      return;
    }

    const fetchBatchAnalytics = async () => {
      setDrilldownLoading(true);
      try {
        const res = await apiGet<any>(`/attainment/batch/${selectedBatch._id}/${selectedSemester._id}`);
        setBatchPOData(res.data?.poAttainments || []);
      } catch (err: any) {
        setBatchPOData([]);
        // Handle quietly if configs are missing
        if (err.response?.data?.code !== 'CONFIG_REQUIRED') {
          showToast(err.response?.data?.message || 'Failed to load batch data', 'error');
        }
      } finally {
        setDrilldownLoading(false);
      }
    };

    fetchBatchAnalytics();
  }, [selectedBatch, selectedSemester]);

  if (loading) {
    return (
      <DashboardLayout title="Admin Analytics">
        <div className="text-xs font-mono text-zinc-500 py-10 uppercase">
          Loading Admin Analytics...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <RoleGuard allowedRoles={["admin", "superadmin"]}>
      <DashboardLayout title="Admin Analytics">
        <div className="space-y-6">
          {/* Top selection bar */}
          <div className="flex flex-col md:flex-row gap-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none">
            <div className="flex-1">
              <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5 font-bold">Academic Semester</label>
              {semesters.length === 0 ? (
                <div className="text-xs font-mono text-zinc-500 italic uppercase">No semesters available.</div>
              ) : (
                <select
                  value={selectedSemester?._id || ''}
                  onChange={(e) => {
                    const found = semesters.find(s => s._id === e.target.value);
                    if (found) setSelectedSemester(found);
                  }}
                  className="block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
                >
                  {semesters.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Config Alert Panel if thresholds not configured */}
          {!config && selectedDept && (
            <div className="p-6 border border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 font-mono rounded-none flex items-start gap-4 animate-in fade-in duration-300">
              <AlertTriangle className="w-8 h-8 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold uppercase mb-1.5">Configure attainment thresholds to enable OBE analytics for {selectedDept.name} ({selectedDept.code})</h4>
                <p className="text-xs leading-relaxed">
                  This department has not set the thresholds for direct student evaluations. 
                  Scroll down to the <strong>OBE Thresholds Configuration</strong> panel, adjust the sliders, and click save.
                </p>
              </div>
            </div>
          )}

          {/* Row 1: Cross-department PO comparisons */}
          <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-150 dark:border-zinc-800 pb-3">
              <BarChart2 className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              <h3 className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 uppercase">
                Cross-Department Program Outcomes Comparison
              </h3>
            </div>

            {comparisonLoading ? (
              <div className="text-xs font-mono text-zinc-500 py-16 uppercase">Compiling cross-department statistics...</div>
            ) : comparisonData.length === 0 ? (
              <div className="text-xs font-mono text-zinc-500 py-16 uppercase italic text-center">No program outcomes compared.</div>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                    <XAxis dataKey="po" tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 3]} tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', fontFamily: 'monospace', fontSize: '11px' }}
                      labelStyle={{ color: '#fafafa', fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: '10px' }} />
                    {departments.map((dept, idx) => {
                      const colors = ['#a78bfa', '#38bdf8', '#fb7185', '#34d399'];
                      return (
                        <Bar
                          key={dept.code}
                          dataKey={dept.code}
                          fill={colors[idx % colors.length]}
                          maxBarSize={30}
                        />
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Row 2: Batch drill down */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Batch Selector Panel */}
            <div className="xl:col-span-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-6">
              <div className="flex items-center gap-2 border-b border-zinc-150 dark:border-zinc-800 pb-3">
                <Layers className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                <h3 className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 uppercase">
                  Batch Selector
                </h3>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase mb-1 font-bold">1. Select Department</label>
                  <select
                    value={selectedDept?._id || ''}
                    onChange={(e) => {
                      const found = departments.find(d => d._id === e.target.value);
                      if (found) setSelectedDept(found);
                    }}
                    className="block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
                  >
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase mb-1 font-bold">2. Select Batch</label>
                  {batches.length === 0 ? (
                    <div className="p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-zinc-400 italic">
                      NO BATCHES FOUND
                    </div>
                  ) : (
                    <select
                      value={selectedBatch?._id || ''}
                      onChange={(e) => {
                        const found = batches.find(b => b._id === e.target.value);
                        if (found) setSelectedBatch(found);
                      }}
                      className="block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
                    >
                      {batches.map((b) => (
                        <option key={b._id} value={b._id}>{b.name} (Code: {b.code})</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Radar Drill-down view */}
            <div className="xl:col-span-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-4">
              <h3 className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 uppercase border-b border-zinc-100 dark:border-zinc-800 pb-3">
                Batch PO Attainment Radar (0-3 Scale)
              </h3>

              {drilldownLoading ? (
                <div className="text-xs font-mono text-zinc-500 py-16 uppercase">Drilling down into batch outcomes...</div>
              ) : !selectedBatch ? (
                <div className="text-xs font-mono text-zinc-500 py-16 uppercase italic text-center">Select a batch to analyze.</div>
              ) : batchPOData.length === 0 ? (
                <div className="p-4 border border-amber-300 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 text-xs font-mono uppercase text-center py-16">
                  Analytics unavailable for this batch in the selected semester. (Config or marks may be missing).
                </div>
              ) : (
                <div className="h-64 w-full flex justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={batchPOData}>
                      <PolarGrid stroke="#27272a" />
                      <PolarAngleAxis dataKey="po" tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 3]} tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }} />
                      <Radar name="Batch PO Attainment" dataKey="attainmentScore" stroke="#38bdf8" fill="#0ea5e9" fillOpacity={0.4} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', fontFamily: 'monospace', fontSize: '11px' }}
                        formatter={(value: any) => [`${value} / 3.00`, 'Score']}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

          </div>

          {/* Config Sliders Panel */}
          {selectedDept && (
            <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 border-b border-zinc-150 dark:border-zinc-800 pb-3">
                <Settings className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                <h3 className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 uppercase">
                  OBE Thresholds Configuration ({selectedDept.code})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono text-xs">
                {/* Sliders Controls */}
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2 uppercase font-bold text-zinc-700 dark:text-zinc-300">
                      <span>Student Pass Threshold</span>
                      <span className="text-zinc-900 dark:text-zinc-50">{studentPass}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={studentPass}
                      onChange={(e) => handleStudentPassChange(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                    />
                    <p className="text-[10px] text-zinc-400 uppercase mt-1">Percentage of CO marks a student needs to pass a CO</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2 uppercase font-bold text-zinc-700 dark:text-zinc-300">
                      <span>Level 3 Threshold</span>
                      <span className="text-zinc-900 dark:text-zinc-50">{lvl3}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={lvl3}
                      onChange={(e) => handleLvl3Change(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                    />
                    <p className="text-[10px] text-zinc-400 uppercase mt-1">Percentage of class students that must pass for Level 3</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2 uppercase font-bold text-zinc-700 dark:text-zinc-300">
                      <span>Level 2 Threshold</span>
                      <span className="text-zinc-900 dark:text-zinc-50">{lvl2}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={lvl2}
                      onChange={(e) => handleLvl2Change(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                    />
                    <p className="text-[10px] text-zinc-400 uppercase mt-1">Percentage of class students that must pass for Level 2</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2 uppercase font-bold text-zinc-700 dark:text-zinc-300">
                      <span>Level 1 Threshold</span>
                      <span className="text-zinc-900 dark:text-zinc-50">{lvl1}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={lvl1}
                      onChange={(e) => handleLvl1Change(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                    />
                    <p className="text-[10px] text-zinc-400 uppercase mt-1">Percentage of class students that must pass for Level 1</p>
                  </div>
                </div>

                {/* Sliders Real-time Visualization Rule Check */}
                <div className="flex flex-col justify-between border border-dashed border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-950/20">
                  <div className="space-y-4">
                    <h4 className="font-bold uppercase text-[10px] text-zinc-400">Inequality Constraint Check</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <span>LEVEL 3 THRESHOLD &gt; LEVEL 2 THRESHOLD</span>
                        <span className={lvl3 > lvl2 ? "text-green-600 dark:text-green-400 font-bold" : "text-red-500 font-bold"}>
                          {lvl3} &gt; {lvl2} {lvl3 > lvl2 ? "✓" : "✗"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <span>LEVEL 2 THRESHOLD &gt; LEVEL 1 THRESHOLD</span>
                        <span className={lvl2 > lvl1 ? "text-green-600 dark:text-green-400 font-bold" : "text-red-500 font-bold"}>
                          {lvl2} &gt; {lvl1} {lvl2 > lvl1 ? "✓" : "✗"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      onClick={handleSaveConfig}
                      disabled={savingConfig || !isConfigChanged || (lvl3 <= lvl2 || lvl2 <= lvl1)}
                      className="w-full px-3 py-2 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer uppercase text-center"
                    >
                      {savingConfig ? 'SAVING CONFIG...' : 'SAVE THRESHOLDS'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
}
