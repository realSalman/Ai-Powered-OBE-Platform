"use client";

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import RoleGuard from '@/components/RoleGuard';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { apiGet, apiPut } from '@/lib/api';
import { ISemester, IAttainmentConfig, ICourseOffering, IOfferingAttainment } from '@/types/api';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { AlertTriangle, Settings, RefreshCw, Layers } from 'lucide-react';

export default function HodAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [semesters, setSemesters] = useState<ISemester[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<ISemester | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Department PO data
  const [deptPOData, setDeptPOData] = useState<any[]>([]);

  // Course offerings in department for semester
  const [offerings, setOfferings] = useState<ICourseOffering[]>([]);
  const [offeringAttainments, setOfferingAttainments] = useState<{ [offeringId: string]: IOfferingAttainment }>({});

  // Configuration Sliders State
  const [config, setConfig] = useState<IAttainmentConfig | null>(null);
  const [studentPass, setStudentPass] = useState<number>(0);
  const [lvl3, setLvl3] = useState<number>(0);
  const [lvl2, setLvl2] = useState<number>(0);
  const [lvl1, setLvl1] = useState<number>(0);
  const [isConfigChanged, setIsConfigChanged] = useState(false);

  // Fetch initial department configuration and active semesters
  const fetchInitialData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch semesters
      const semRes = await apiGet<ISemester[]>('/semesters', { limit: 50 });
      const semList = semRes.data || [];
      setSemesters(semList);
      
      const activeSem = semList.find(s => s.status === 'active') || semList[0] || null;
      setSelectedSemester(activeSem);

      // 2. Fetch HOD attainment configuration
      await fetchConfig();

    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to initialize dashboard dependencies', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const configRes = await apiGet<IAttainmentConfig>('/attainment/config');
      const cfg = configRes.data;
      setConfig(cfg);
      if (cfg) {
        setStudentPass(cfg.studentPassThreshold);
        setLvl3(cfg.level3Threshold);
        setLvl2(cfg.level2Threshold);
        setLvl1(cfg.level1Threshold);
        setIsConfigChanged(false);
      }
    } catch (err: any) {
      if (err.response?.data?.code === 'CONFIG_REQUIRED') {
        setConfig(null);
        // Default sliders to empty state (no pre-set defaults per guidelines)
        setStudentPass(0);
        setLvl3(0);
        setLvl2(0);
        setLvl1(0);
      } else {
        showToast(err.response?.data?.message || 'Failed to fetch thresholds config', 'error');
      }
    }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    fetchInitialData();
  }, [authLoading, user]);

  // Fetch department analytics when semester or config changes
  useEffect(() => {
    if (!user || !selectedSemester) return;

    const fetchDepartmentAnalytics = async () => {
      setDataLoading(true);
      const deptId = user.department || '';
      const semId = selectedSemester._id;

      try {
        // 1. Fetch Department PO Attainment
        const deptRes = await apiGet<any>(`/attainment/department/${deptId}/${semId}`);
        setDeptPOData(deptRes.data?.poAttainments || []);

        // 2. Fetch all offerings for department + semester
        const offeringsRes = await apiGet<ICourseOffering[]>('/offerings', {
          department: deptId,
          semester: semId,
          limit: 100,
        });
        const offeringList = offeringsRes.data || [];
        setOfferings(offeringList);

        // 3. Fetch each course offering attainment
        const attMaps: { [offeringId: string]: IOfferingAttainment } = {};
        await Promise.all(
          offeringList.map(async (offering) => {
            try {
              const res = await apiGet<IOfferingAttainment>(`/attainment/offering/${offering._id}`);
              attMaps[offering._id] = res.data;
            } catch (err) {
              console.error(`Failed to get attainment for course ${offering.courseCode}`, err);
            }
          })
        );
        setOfferingAttainments(attMaps);

      } catch (err: any) {
        if (err.response?.data?.code === 'CONFIG_REQUIRED') {
          setDeptPOData([]);
          setOfferings([]);
          setOfferingAttainments({});
        } else {
          showToast(err.response?.data?.message || 'Failed to load department analytics', 'error');
        }
      } finally {
        setDataLoading(false);
      }
    };

    fetchDepartmentAnalytics();
  }, [user, selectedSemester, config]);

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
    if (!user) return;
    if (lvl3 <= lvl2 || lvl2 <= lvl1) {
      showToast('Validation failed: Level 3 > Level 2 > Level 1 threshold constraint violated', 'error');
      return;
    }

    setSavingConfig(true);
    const deptId = user.department || '';
    
    try {
      await apiPut('/attainment/config', {
        department: deptId,
        studentPassThreshold: studentPass,
        level3Threshold: lvl3,
        level2Threshold: lvl2,
        level1Threshold: lvl1,
      });
      showToast('Department attainment thresholds saved successfully', 'success');
      await fetchConfig();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save configuration', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // Compile warnings of low-attainment (CO attainment Level 0)
  const getLowAttainmentAlerts = () => {
    const alerts: any[] = [];
    Object.entries(offeringAttainments).forEach(([offeringId, att]) => {
      const offering = offerings.find(o => o._id === offeringId);
      if (!offering) return;

      att.coAttainments.forEach((co) => {
        if (co.attainmentLevel === 0) {
          const batchCode = offering.batch && typeof offering.batch === 'object' ? offering.batch.code : '';
          const secFormatted = batchCode ? `${batchCode}_${offering.section}` : offering.section;
          alerts.push({
            courseCode: offering.courseCode,
            section: secFormatted,
            co: co.co,
            attainmentPct: co.attainmentPct.toFixed(1),
            description: co.description,
          });
        }
      });
    });
    return alerts;
  };

  // Heatmap Level Color Helpers
  const getCellColorClass = (level: number) => {
    switch (level) {
      case 3: return 'bg-emerald-500 text-white font-bold text-center';
      case 2: return 'bg-emerald-300 text-zinc-900 font-semibold text-center';
      case 1: return 'bg-amber-300 text-zinc-900 text-center';
      default: return 'bg-rose-500 text-white text-center';
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="HOD Analytics">
        <div className="text-xs font-mono text-zinc-500 py-10 uppercase">
          Loading HOD dashboard...
        </div>
      </DashboardLayout>
    );
  }

  const lowAttainmentAlerts = getLowAttainmentAlerts();

  return (
    <RoleGuard allowedRoles={["HOD"]}>
      <DashboardLayout title="HOD Analytics">
        <div className="space-y-6">
          
          {/* Top selection bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none">
            <div className="w-full md:w-1/2">
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
          {!config && (
            <div className="p-6 border border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 font-mono rounded-none flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold uppercase mb-1.5">Configure attainment thresholds to enable OBE analytics</h4>
                <p className="text-xs leading-relaxed">
                  Your department has not set the thresholds for direct student evaluations. 
                  Scroll down to the <strong>OBE Thresholds Configuration</strong> panel, adjust the sliders, and click save.
                </p>
              </div>
            </div>
          )}

          {config && (
            <div className="space-y-6">
              {/* Row 1: Radar Chart & Alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Department Radar Chart */}
                <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-4">
                  <h3 className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 uppercase border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    Department-Wide PO Attainment (0-3 Scale)
                  </h3>
                  {dataLoading ? (
                    <div className="text-xs font-mono text-zinc-500 py-20 uppercase">Analyzing outcomes...</div>
                  ) : deptPOData.length === 0 ? (
                    <div className="text-xs font-mono text-zinc-500 py-20 uppercase italic text-center">No program outcomes mapped.</div>
                  ) : (
                    <div className="h-64 w-full flex justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={deptPOData}>
                          <PolarGrid stroke="#27272a" />
                          <PolarAngleAxis dataKey="po" tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 3]} tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }} />
                          <Radar name="Department PO Attainment" dataKey="attainmentScore" stroke="#a78bfa" fill="#c084fc" fillOpacity={0.4} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', fontFamily: 'monospace', fontSize: '11px' }}
                            formatter={(value: any) => [`${value} / 3.00`, 'Score']}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Low Attainment Warnings */}
                <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-4">
                  <h3 className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 uppercase border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    Low-Attainment Course Warnings
                  </h3>
                  
                  {dataLoading ? (
                    <div className="text-xs font-mono text-zinc-500 py-10 uppercase">Diagnosing courses...</div>
                  ) : lowAttainmentAlerts.length === 0 ? (
                    <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/20 text-zinc-500 text-xs font-mono uppercase text-center">
                      No course-level CO attainment alerts in this semester.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {lowAttainmentAlerts.map((alert, idx) => (
                        <div key={idx} className="p-3 border border-red-200 dark:border-red-950/50 bg-red-500/5 font-mono text-[10px] space-y-1">
                          <div className="flex justify-between items-center text-red-600 dark:text-red-400 font-bold uppercase">
                            <span>{alert.courseCode} (SEC {alert.section}) • {alert.co}</span>
                            <span>Level 0 ({alert.attainmentPct}%)</span>
                          </div>
                          <p className="text-zinc-500 leading-normal normal-case">
                            Description: {alert.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Row 2: Course Outcomes Comparison Matrix */}
              <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-4">
                <h3 className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 uppercase border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  Course Outcomes Attainment Comparison Matrix
                </h3>

                {dataLoading ? (
                  <div className="text-xs font-mono text-zinc-500 py-10 uppercase">Building matrix...</div>
                ) : offerings.length === 0 ? (
                  <div className="text-xs font-mono text-zinc-500 py-6 uppercase italic text-center">No offerings in this semester.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-950">
                          <th className="px-4 py-3 border border-zinc-200 dark:border-zinc-800 uppercase font-semibold min-w-44">Course</th>
                          <th className="px-4 py-3 border border-zinc-200 dark:border-zinc-800 uppercase font-semibold text-center min-w-16">Section</th>
                          <th className="px-4 py-3 border border-zinc-200 dark:border-zinc-800 uppercase font-semibold text-center min-w-20">CO1</th>
                          <th className="px-4 py-3 border border-zinc-200 dark:border-zinc-800 uppercase font-semibold text-center min-w-20">CO2</th>
                          <th className="px-4 py-3 border border-zinc-200 dark:border-zinc-800 uppercase font-semibold text-center min-w-20">CO3</th>
                          <th className="px-4 py-3 border border-zinc-200 dark:border-zinc-800 uppercase font-semibold text-center min-w-20">CO4</th>
                          <th className="px-4 py-3 border border-zinc-200 dark:border-zinc-800 uppercase font-semibold text-center min-w-20">CO5</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {offerings.map((offering) => {
                          const att = offeringAttainments[offering._id];
                          const coLevels = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'].map((coCode) => {
                            const coObj = att?.coAttainments.find(c => c.co === coCode);
                            return coObj ? coObj.attainmentLevel : null;
                          });

                          return (
                            <tr key={offering._id} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-850/20 transition-colors">
                              <td className="px-4 py-3 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium">
                                {offering.courseCode} - {offering.courseTitle}
                              </td>
                              <td className="px-4 py-3 border border-zinc-200 dark:border-zinc-800 font-bold text-zinc-900 dark:text-zinc-100 text-center">
                                {offering.batch && typeof offering.batch === 'object' ? `${offering.batch.code}_${offering.section}` : offering.section}
                              </td>
                              {coLevels.map((lvl, idx) => (
                                <td
                                  key={idx}
                                  className={`px-4 py-3 border border-zinc-200 dark:border-zinc-800 ${
                                    lvl !== null ? getCellColorClass(lvl) : 'text-center text-zinc-400 dark:text-zinc-700 bg-zinc-50 dark:bg-zinc-950/20'
                                  }`}
                                >
                                  {lvl !== null ? `L${lvl}` : 'N/A'}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Config Sliders Panel */}
          <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-150 dark:border-zinc-800 pb-3">
              <Settings className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              <h3 className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 uppercase">
                OBE Thresholds Configuration
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

        </div>
      </DashboardLayout>
    </RoleGuard>
  );
}
