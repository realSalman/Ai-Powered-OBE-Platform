"use client";

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import RoleGuard from '@/components/RoleGuard';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { apiGet } from '@/lib/api';
import {
  IEnrollment,
  ICognitiveGapAnalysis,
  IPathToPrediction,
} from '@/types/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';

// ────── Status helpers ──────

const statusColor = (status: string) => {
  switch (status) {
    case 'strong': case 'safe':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case 'achievable':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400';
    case 'at-risk': case 'warning':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400';
    case 'weak': case 'critical':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400';
    default:
      return 'border-zinc-500/30 bg-zinc-500/10 text-zinc-500';
  }
};

const riskBannerStyle = (risk: string) => {
  switch (risk) {
    case 'safe':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    case 'warning':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    case 'critical':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300';
    default:
      return 'border-zinc-300 bg-zinc-50 text-zinc-600';
  }
};

const riskIcon = (risk: string) => {
  switch (risk) {
    case 'safe': return '✓';
    case 'warning': return '⚠';
    case 'critical': return '✕';
    default: return '—';
  }
};

const bloomBarColor = (status: string) => {
  switch (status) {
    case 'strong': return '#10b981';
    case 'at-risk': return '#f59e0b';
    case 'weak': return '#f43f5e';
    default: return '#71717a';
  }
};

// ────── Component ──────

export default function StudentInsightsPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [enrollments, setEnrollments] = useState<IEnrollment[]>([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState<IEnrollment | null>(null);
  const [loading, setLoading] = useState(true);

  // Feature data
  const [gaps, setGaps] = useState<ICognitiveGapAnalysis | null>(null);
  const [prediction, setPrediction] = useState<IPathToPrediction | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Fetch enrollments
  useEffect(() => {
    if (authLoading || !user) return;
    const fetchEnrollments = async () => {
      setLoading(true);
      try {
        const res = await apiGet<IEnrollment[]>('/enrollments/me', { status: 'active', limit: 100 });
        setEnrollments(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedEnrollment(res.data[0]);
        }
      } catch (err: any) {
        showToast(err.response?.data?.message || 'Failed to fetch enrolled courses', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchEnrollments();
  }, [authLoading, user]);

  // Fetch insights when course changes
  useEffect(() => {
    if (!user || !selectedEnrollment) return;
    const offeringId = typeof selectedEnrollment.courseOffering === 'object'
      ? selectedEnrollment.courseOffering._id
      : selectedEnrollment.courseOffering;

    const fetchInsights = async () => {
      setInsightsLoading(true);
      setGaps(null);
      setPrediction(null);
      try {
        const [gapsRes, predRes] = await Promise.all([
          apiGet<ICognitiveGapAnalysis>(`/student-insights/gaps/${offeringId}`),
          apiGet<IPathToPrediction>(`/student-insights/prediction/${offeringId}`),
        ]);
        setGaps(gapsRes.data);
        setPrediction(predRes.data);
      } catch (err: any) {
        showToast(err.response?.data?.message || 'Failed to load insights', 'error');
      } finally {
        setInsightsLoading(false);
      }
    };
    fetchInsights();
  }, [user, selectedEnrollment]);

  if (loading) {
    return (
      <DashboardLayout title="Performance Insights">
        <div className="text-xs font-mono text-zinc-500 py-10 uppercase">Loading…</div>
      </DashboardLayout>
    );
  }

  return (
    <RoleGuard allowedRoles={["student"]}>
      <DashboardLayout title="Performance Insights">
        <div className="space-y-6">

          {/* ── Course Selector ── */}
          <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <h3 className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 uppercase mb-4">Select Course</h3>
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

          {insightsLoading && (
            <div className="text-xs font-mono text-zinc-500 uppercase py-6">Analyzing your performance…</div>
          )}

          {/* ────────────────────────────────────────────────────────────── */}
          {/* SECTION 1: PATH TO PASS PREDICTOR                            */}
          {/* ────────────────────────────────────────────────────────────── */}
          {prediction && !insightsLoading && (
            <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
              <h3 className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 uppercase border-b border-zinc-100 dark:border-zinc-800 pb-3">
                Path to Pass Predictor
              </h3>

              {/* Risk Banner */}
              <div className={`p-4 border font-mono ${riskBannerStyle(prediction.overallRisk)}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{riskIcon(prediction.overallRisk)}</span>
                  <div>
                    <div className="text-xs font-bold uppercase">
                      Overall Status: {prediction.overallRisk.toUpperCase()}
                    </div>
                    <p className="text-[11px] mt-1 leading-relaxed opacity-90">
                      {prediction.summary}
                    </p>
                  </div>
                </div>
              </div>

              {/* CO Projections */}
              {prediction.coProjections.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-mono font-bold text-zinc-500 uppercase">CO Projections</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {prediction.coProjections.map((proj) => (
                      <div
                        key={proj.co}
                        className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 p-4 space-y-3"
                      >
                        {/* Header: CO + Status badge */}
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-50">{proj.co}</span>
                            <span className="ml-2 text-[9px] font-mono text-zinc-400 uppercase">{proj.bloomLevel}</span>
                          </div>
                          <span className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase border ${statusColor(proj.status)}`}>
                            {proj.status.toUpperCase()}
                          </span>
                        </div>

                        <p className="text-[10px] font-mono text-zinc-500 leading-relaxed">{proj.description}</p>

                        {/* Score bars */}
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-[9px] font-mono text-zinc-400 uppercase mb-1">
                              <span>Current Score</span>
                              <span>{proj.currentPercentage}%</span>
                            </div>
                            <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800">
                              <div
                                className="h-full bg-zinc-700 dark:bg-zinc-300 transition-all duration-500"
                                style={{ width: `${Math.min(proj.currentPercentage, 100)}%` }}
                              />
                            </div>
                          </div>

                          {proj.upcomingExams.length > 0 && (
                            <div>
                              <div className="flex justify-between text-[9px] font-mono text-zinc-400 uppercase mb-1">
                                <span>Need on Remaining</span>
                                <span className={`font-bold ${
                                  proj.requiredPercentage > 85 ? 'text-rose-500' :
                                  proj.requiredPercentage > 60 ? 'text-amber-500' :
                                  'text-emerald-500'
                                }`}>
                                  {proj.requiredPercentage}%
                                </span>
                              </div>
                              <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800">
                                <div
                                  className={`h-full transition-all duration-500 ${
                                    proj.requiredPercentage > 85 ? 'bg-rose-500' :
                                    proj.requiredPercentage > 60 ? 'bg-amber-500' :
                                    'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(proj.requiredPercentage, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Exam tags */}
                        <div className="flex flex-wrap gap-1.5">
                          {proj.completedExams.map(e => (
                            <span key={e} className="px-1.5 py-0.5 text-[8px] font-mono uppercase border border-zinc-300 dark:border-zinc-700 text-zinc-500">
                              ✓ {e}
                            </span>
                          ))}
                          {proj.upcomingExams.map(e => (
                            <span key={e} className="px-1.5 py-0.5 text-[8px] font-mono uppercase border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400">
                              ○ {e}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────── */}
          {/* SECTION 2: COGNITIVE GAP ANALYZER                             */}
          {/* ────────────────────────────────────────────────────────────── */}
          {gaps && !insightsLoading && (
            <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-6">
              <h3 className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 uppercase border-b border-zinc-100 dark:border-zinc-800 pb-3">
                Cognitive Gap Analysis
              </h3>

              {/* Diagnosis Card */}
              {gaps.diagnosis && (
                <div className="p-4 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/40">
                  <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase mb-2">Diagnosis</div>
                  <p className="text-xs font-mono text-zinc-800 dark:text-zinc-200 leading-relaxed">
                    {gaps.diagnosis}
                  </p>
                </div>
              )}

              {/* Bloom's Taxonomy Bar Chart */}
              {gaps.bloomBreakdown.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-mono font-bold text-zinc-500 uppercase mb-3">
                    Performance by Bloom&apos;s Taxonomy Level
                  </h4>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gaps.bloomBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                        <XAxis
                          dataKey="level"
                          tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', fontFamily: 'monospace', fontSize: '11px' }}
                          labelStyle={{ color: '#fafafa', fontWeight: 'bold' }}
                          formatter={(value: any, _name: any, props: any) => [
                            `${value}% (${props.payload.totalObtained}/${props.payload.totalPossible} marks)`,
                            'Score'
                          ]}
                        />
                        <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="3 3" label="" />
                        <Bar dataKey="percentage" maxBarSize={50}>
                          {gaps.bloomBreakdown.map((entry, index) => (
                            <Cell key={`bloom-${index}`} fill={bloomBarColor(entry.status)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Bloom legend */}
                  <div className="flex flex-wrap gap-3 mt-3">
                    {gaps.bloomBreakdown.map(b => (
                      <div key={b.level} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5" style={{ backgroundColor: bloomBarColor(b.status) }} />
                        <span className="text-[9px] font-mono text-zinc-500 uppercase">{b.level}: {b.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CO Breakdown Cards */}
              {gaps.coBreakdown.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-mono font-bold text-zinc-500 uppercase mb-3">
                    Course Outcome Breakdown
                  </h4>
                  <div className="space-y-3">
                    {gaps.coBreakdown.map((co) => (
                      <div
                        key={co.co}
                        className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 p-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase border ${statusColor(co.status)}`}>
                              {co.co}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-400 uppercase">{co.bloomLevel} Level</span>
                          </div>
                          <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-50">
                            {co.percentage}%
                          </span>
                        </div>

                        <p className="text-[10px] font-mono text-zinc-500 mb-3">{co.description}</p>

                        {/* Progress bar */}
                        <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 mb-3">
                          <div
                            className={`h-full transition-all duration-500 ${
                              co.status === 'strong' ? 'bg-emerald-500' :
                              co.status === 'at-risk' ? 'bg-amber-500' :
                              'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(co.percentage, 100)}%` }}
                          />
                        </div>

                        {/* Weak Questions */}
                        {co.weakQuestions.length > 0 && (
                          <div className="space-y-1.5 mt-3 pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                            <div className="text-[9px] font-mono font-bold text-zinc-400 uppercase">Questions to Review</div>
                            {co.weakQuestions.slice(0, 3).map((wq, i) => (
                              <div key={i} className="flex gap-3 items-start p-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[9px] font-mono font-bold text-zinc-600 dark:text-zinc-300">
                                      Q{wq.number}
                                    </span>
                                    <span className="text-[8px] font-mono text-zinc-400 uppercase">
                                      {wq.examName}
                                    </span>
                                    <span className="text-[8px] font-mono text-rose-500 font-bold">
                                      {wq.obtained}/{wq.maxMarks}
                                    </span>
                                  </div>
                                  {wq.text && (
                                    <p className="text-[10px] font-mono text-zinc-500 leading-relaxed line-clamp-2">
                                      {wq.text}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!insightsLoading && !gaps && !prediction && selectedEnrollment && (
            <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
              <p className="text-xs font-mono text-zinc-500 uppercase">
                No exam data available for analysis yet.
              </p>
            </div>
          )}
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
}
