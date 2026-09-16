"use client";

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import RoleGuard from '@/components/RoleGuard';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { apiGet } from '@/lib/api';
import { IEnrollment, IStudentMark, IAttainmentConfig, ICourse } from '@/types/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

export default function StudentMarksPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [enrollments, setEnrollments] = useState<IEnrollment[]>([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState<IEnrollment | null>(null);
  const [marks, setMarks] = useState<IStudentMark[]>([]);
  const [config, setConfig] = useState<IAttainmentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [marksLoading, setMarksLoading] = useState(false);

  // Fetch enrollments on load
  useEffect(() => {
    if (authLoading || !user) return;

    const fetchEnrollments = async () => {
      setLoading(true);
      try {
        const enrollmentsRes = await apiGet<IEnrollment[]>('/enrollments/me', { status: 'active', limit: 100 });
        setEnrollments(enrollmentsRes.data || []);
        if (enrollmentsRes.data && enrollmentsRes.data.length > 0) {
          setSelectedEnrollment(enrollmentsRes.data[0]);
        }
      } catch (err: any) {
        showToast(err.response?.data?.message || 'Failed to fetch enrolled courses', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchEnrollments();
  }, [authLoading, user]);

  // Fetch marks and config when course selection changes
  useEffect(() => {
    if (!user || !selectedEnrollment) return;

    const fetchCourseMarksAndConfig = async () => {
      setMarksLoading(true);
      try {
        const offeringId = typeof selectedEnrollment.courseOffering === 'object' ? selectedEnrollment.courseOffering._id : selectedEnrollment.courseOffering;
        
        // Fetch marks for this offering
        const marksRes = await apiGet<IStudentMark[]>(`/marks/student/${user._id}`, {
          courseOffering: offeringId,
        });
        setMarks(marksRes.data || []);

        // Fetch department config to know threshold
        const configRes = await apiGet<IAttainmentConfig>('/attainment/config');
        setConfig(configRes.data);
      } catch (err: any) {
        // If config is not set yet, handle gracefully
        if (err.response?.data?.code === 'CONFIG_REQUIRED') {
          setConfig(null);
        } else {
          showToast(err.response?.data?.message || 'Failed to load grade details', 'error');
        }
      } finally {
        setMarksLoading(false);
      }
    };

    fetchCourseMarksAndConfig();
  }, [user, selectedEnrollment]);

  // Calculate CO achievement data for chart
  const getCoChartData = () => {
    if (!selectedEnrollment || !selectedEnrollment.courseOffering || typeof selectedEnrollment.courseOffering !== 'object') {
      return [];
    }

    const courseObj = selectedEnrollment.courseOffering.course as ICourse;
    if (!courseObj || !courseObj.courseOutcomes) {
      return [];
    }

    const outcomes = courseObj.courseOutcomes;
    
    // Map of coCode -> { obtained, possible }
    const coScores: { [co: string]: { obtained: number; possible: number } } = {};
    outcomes.forEach((co) => {
      coScores[co.code] = { obtained: 0, possible: 0 };
    });

    marks.forEach((m) => {
      const examObj = typeof m.exam === 'object' ? m.exam : null;
      if (!examObj) return;

      examObj.questions.forEach((q) => {
        const studentQMark = m.questionMarks.find((qm) => qm.question === q.number);
        const obtained = studentQMark ? studentQMark.marksObtained : 0;

        if (q.coMapping) {
          q.coMapping.forEach((map) => {
            if (coScores[map.co]) {
              coScores[map.co].obtained += obtained * (map.percentage / 100);
              coScores[map.co].possible += q.marks * (map.percentage / 100);
            }
          });
        }
      });
    });

    return outcomes.map((co) => {
      const scores = coScores[co.code];
      const percentage = scores.possible > 0 ? (scores.obtained / scores.possible) * 100 : 0;
      return {
        co: co.code,
        description: co.description,
        bloomLevel: co.bloomLevel,
        percentage: Number(percentage.toFixed(1)),
        obtained: Number(scores.obtained.toFixed(1)),
        possible: Number(scores.possible.toFixed(1)),
      };
    });
  };

  if (loading) {
    return (
      <DashboardLayout title="My Grades">
        <div className="text-xs font-mono text-zinc-500 py-10 uppercase">
          Loading course grades...
        </div>
      </DashboardLayout>
    );
  }

  const chartData = getCoChartData();
  const passThreshold = config?.studentPassThreshold ?? 50; // default to 50 if department hasn't set it yet

  return (
    <RoleGuard allowedRoles={["student"]}>
      <DashboardLayout title="My Grades">
        <div className="space-y-6">
          {/* Course Selector */}
          <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none">
            <h3 className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 uppercase mb-4">Select Enrolled Course</h3>
            {enrollments.length === 0 ? (
              <p className="text-xs font-mono text-zinc-500 uppercase italic">Not enrolled in any active courses.</p>
            ) : (
              <select
                value={selectedEnrollment?._id || ''}
                onChange={(e) => {
                  const found = enrollments.find(env => env._id === e.target.value);
                  if (found) setSelectedEnrollment(found);
                }}
                className="block w-full md:w-1/2 px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
              >
                {enrollments.map((env) => {
                  const offering = env.courseOffering;
                  if (typeof offering === 'object') {
                    const batchCode = (offering as any).batch?.code;
                    const secFormatted = batchCode ? `${batchCode}_${offering.section}` : offering.section;
                    return (
                      <option key={env._id} value={env._id}>
                        {offering.courseCode} (SEC {secFormatted}) - {offering.semesterName}
                      </option>
                    );
                  }
                  return <option key={env._id} value={env._id}>{env._id}</option>;
                })}
              </select>
            )}
          </div>

          {selectedEnrollment && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Left Column: Grade breakdown table */}
              <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-6">
                <h3 className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 uppercase border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  Exam & Question Marks
                </h3>

                {marksLoading ? (
                  <div className="text-xs font-mono text-zinc-500 uppercase">Loading grade details...</div>
                ) : marks.length === 0 ? (
                  <div className="text-xs font-mono text-zinc-500 uppercase italic">No marks submitted yet for this course.</div>
                ) : (
                  <div className="space-y-6">
                    {marks.map((mark) => {
                      const examObj = typeof mark.exam === 'object' ? mark.exam : null;
                      if (!examObj) return null;

                      return (
                        <div key={mark._id} className="border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-950/40">
                          <div className="flex justify-between items-center border-b border-dashed border-zinc-200 dark:border-zinc-800 pb-2 mb-3">
                            <span className="font-mono text-xs font-bold uppercase text-zinc-900 dark:text-zinc-50">{examObj.name}</span>
                            <span className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-300">
                              {mark.totalObtained} / {examObj.totalMarks}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {examObj.questions.map((q) => {
                              const qMark = mark.questionMarks.find(qm => qm.question === q.number);
                              const score = qMark ? qMark.marksObtained : 0;
                              return (
                                <div key={q.number} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 font-mono text-center">
                                  <div className="text-[9px] text-zinc-400 uppercase">Q {q.number}</div>
                                  <div className="text-sm font-bold mt-1 text-zinc-900 dark:text-zinc-50">{score}</div>
                                  <div className="text-[8px] text-zinc-500 uppercase border-t border-zinc-100 dark:border-zinc-800 mt-1 pt-1">Max: {q.marks}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: CO achievement analytics */}
              <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-6">
                <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <h3 className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 uppercase">
                    Personal CO Achievement
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">
                    Pass Target: {passThreshold}%
                  </span>
                </div>

                {marksLoading ? (
                  <div className="text-xs font-mono text-zinc-500 uppercase">Loading CO analysis...</div>
                ) : chartData.length === 0 ? (
                  <div className="text-xs font-mono text-zinc-500 uppercase italic">No CO mappings available.</div>
                ) : (
                  <div className="space-y-6">
                    {/* Recharts Bar Chart */}
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                          <XAxis dataKey="co" tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', fontFamily: 'monospace', fontSize: '11px' }}
                            labelStyle={{ color: '#fafafa', fontWeight: 'bold' }}
                            formatter={(value: any, name: any, props: any) => [
                              `${value}% (${props.payload.obtained}/${props.payload.possible} marks)`,
                              'Attainment'
                            ]}
                          />
                          <ReferenceLine y={passThreshold} stroke="#ef4444" strokeDasharray="3 3" />
                          <Bar dataKey="percentage" maxBarSize={40}>
                            {chartData.map((entry, index) => {
                              const isPassed = entry.percentage >= passThreshold;
                              return (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={isPassed ? '#10b981' : '#f43f5e'} // emerald-500 vs rose-500
                                />
                              );
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* CO Legend List */}
                    <div className="space-y-3 font-mono text-xs border-t border-zinc-150 dark:border-zinc-800 pt-4">
                      {chartData.map((item) => {
                        const isPassed = item.percentage >= passThreshold;
                        return (
                          <div key={item.co} className="flex gap-4 items-start p-2 border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20">
                            <span className={`px-2 py-0.5 border text-[9px] font-mono font-bold uppercase min-w-14 text-center ${
                              isPassed 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                            }`}>
                              {item.co}
                            </span>
                            <div className="flex-1 space-y-0.5">
                              <div className="text-zinc-800 dark:text-zinc-200 font-semibold uppercase">{item.bloomLevel} LEVEL</div>
                              <p className="text-[10px] text-zinc-500 leading-normal">{item.description}</p>
                            </div>
                            <span className="font-bold text-zinc-900 dark:text-zinc-50">{item.percentage}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
}
