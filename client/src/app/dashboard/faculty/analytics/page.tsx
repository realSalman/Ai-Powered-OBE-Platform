"use client";

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import RoleGuard from '@/components/RoleGuard';
import { useToast } from '@/components/ui/Toast';
import { apiGet } from '@/lib/api';
import { ICourseOffering, IExam, IOfferingAttainment, IExamAttainment, IStudentMark } from '@/types/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ReferenceLine } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ChevronDown, ChevronUp, Download, Eye } from 'lucide-react';

export default function FacultyAnalyticsPage() {
  const { showToast } = useToast();
  
  const [offerings, setOfferings] = useState<ICourseOffering[]>([]);
  const [selectedOffering, setSelectedOffering] = useState<ICourseOffering | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Attainment state
  const [offeringAttainment, setOfferingAttainment] = useState<IOfferingAttainment | null>(null);
  const [exams, setExams] = useState<IExam[]>([]);
  const [examAttainments, setExamAttainments] = useState<{ [examId: string]: IExamAttainment }>({});
  const [studentMarks, setStudentMarks] = useState<IStudentMark[]>([]);
  
  // UI Accordion state for CO-wise students
  const [expandedCo, setExpandedCo] = useState<string | null>(null);

  // Fetch offerings on load
  useEffect(() => {
    const fetchOfferings = async () => {
      setLoading(true);
      try {
        const res = await apiGet<ICourseOffering[]>('/offerings/me', { limit: 100 });
        setOfferings(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedOffering(res.data[0]);
        }
      } catch (err: any) {
        showToast(err.response?.data?.message || 'Failed to fetch assigned offerings', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchOfferings();
  }, []);

  // Fetch analytics data when offering changes
  useEffect(() => {
    if (!selectedOffering) return;

    const fetchAnalytics = async () => {
      setAnalyticsLoading(true);
      setError(null);
      setOfferingAttainment(null);
      setExams([]);
      setExamAttainments({});
      setStudentMarks([]);
      setExpandedCo(null);
      
      const offeringId = selectedOffering._id;

      try {
        // 1. Fetch Offering Attainment (covers CO, PO, and Config)
        const attainmentRes = await apiGet<IOfferingAttainment>(`/attainment/offering/${offeringId}`);
        setOfferingAttainment(attainmentRes.data);

        // 2. Fetch Exams for this offering
        const examsRes = await apiGet<IExam[]>('/exams', { courseOffering: offeringId, limit: 50 });
        const examList = examsRes.data || [];
        setExams(examList);

        // 3. Fetch Exam-wise Attainments in parallel
        const examAttMaps: { [examId: string]: IExamAttainment } = {};
        await Promise.all(
          examList.map(async (exam) => {
            try {
              const res = await apiGet<IExamAttainment>(`/attainment/exam/${exam._id}`);
              examAttMaps[exam._id] = res.data;
            } catch (err) {
              console.error(`Failed to get attainment for exam ${exam.name}`, err);
            }
          })
        );
        setExamAttainments(examAttMaps);

        // 4. Fetch Student Marks (to compute student status per CO)
        const marksRes = await apiGet<IStudentMark[]>('/marks', { courseOffering: offeringId, limit: 100 });
        setStudentMarks(marksRes.data || []);

      } catch (err: any) {
        if (err.response?.data?.code === 'CONFIG_REQUIRED') {
          setError('CONFIG_REQUIRED');
        } else {
          showToast(err.response?.data?.message || 'Failed to compute analytics', 'error');
        }
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [selectedOffering]);

  const toggleCoAccordion = (coCode: string) => {
    setExpandedCo(expandedCo === coCode ? null : coCode);
  };

  // Helper to split and check which student passed/failed a specific CO
  const getStudentsByCoStatus = (coCode: string) => {
    if (!offeringAttainment || studentMarks.length === 0) return { passed: [], failed: [] };
    const passThreshold = offeringAttainment.config.studentPassThreshold;

    const passed: any[] = [];
    const failed: any[] = [];

    // Extract unique students from studentMarks
    const uniqueStudentsMap = new Map<string, any>();
    studentMarks.forEach((sm) => {
      const studentObj = typeof sm.student === 'object' ? sm.student : null;
      if (studentObj && studentObj._id) {
        uniqueStudentsMap.set(studentObj._id.toString(), studentObj);
      }
    });

    uniqueStudentsMap.forEach((studentObj) => {
      let obtained = 0;
      let possible = 0;

      // Filter all questions across exams that map to this CO
      exams.forEach((exam) => {
        const studentExamMark = studentMarks.find(
          (m) => m.exam && (typeof m.exam === 'object' ? m.exam._id : m.exam) === exam._id && 
                 (typeof m.student === 'object' ? m.student._id : m.student) === studentObj._id
        );

        exam.questions.forEach((q) => {
          if (q.coMapping) {
            const mapping = q.coMapping.find((m) => m.co === coCode);
            if (mapping) {
              const qMark = studentExamMark?.questionMarks.find((qm) => qm.question === q.number);
              const score = qMark ? qMark.marksObtained : 0;

              obtained += score * (mapping.percentage / 100);
              possible += q.marks * (mapping.percentage / 100);
            }
          }
        });
      });

      const pct = possible > 0 ? (obtained / possible) * 100 : 0;
      const studentInfo = {
        name: studentObj.name,
        studentId: studentObj.studentId,
        percentage: pct.toFixed(1),
        marks: `${obtained.toFixed(1)}/${possible.toFixed(1)}`,
      };

      if (pct >= passThreshold) {
        passed.push(studentInfo);
      } else {
        failed.push(studentInfo);
      }
    });

    return { passed, failed };
  };

  // Heatmap Level Color Helpers
  const getHeatmapColorClass = (level: number) => {
    switch (level) {
      case 3: return 'bg-emerald-500 text-white font-bold';
      case 2: return 'bg-emerald-300 text-zinc-900 font-semibold';
      case 1: return 'bg-amber-300 text-zinc-900';
      default: return 'bg-rose-500 text-white';
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    if (!offeringAttainment || !selectedOffering) return;

    const courseCode = typeof selectedOffering.course === 'object' ? selectedOffering.course.code : selectedOffering.courseCode;
    const batchCode = selectedOffering.batch && typeof selectedOffering.batch === 'object' ? selectedOffering.batch.code : '';
    const section = batchCode ? `${batchCode}_${selectedOffering.section}` : selectedOffering.section;

    // 1. CO sheet
    const coData = offeringAttainment.coAttainments.map(co => ({
      'CO Code': co.co,
      'Description': co.description,
      'Bloom Level': co.bloomLevel,
      'Total Students': co.totalStudents,
      'Passing Students': co.passingStudents,
      'Attainment %': co.attainmentPct.toFixed(1),
      'Attainment Level': co.attainmentLevel,
    }));

    // 2. PO sheet
    const poData = offeringAttainment.poAttainments.map(po => ({
      'PO Code': po.po,
      'Description': po.description,
      'Attainment Score (0-3)': po.attainmentScore,
    }));

    // 3. Raw Student Marks sheet
    const rawMarksData: any[] = [];
    studentMarks.forEach((m) => {
      const studentObj = typeof m.student === 'object' ? m.student : null;
      const examObj = typeof m.exam === 'object' ? m.exam : null;
      if (!studentObj || !examObj) return;

      rawMarksData.push({
        'Student Name': studentObj.name,
        'Student ID': studentObj.studentId,
        'Exam Name': examObj.name,
        'Total Score': m.totalObtained,
        'Max Marks': examObj.totalMarks,
      });
    });

    const wb = XLSX.utils.book_new();
    
    const wsCo = XLSX.utils.json_to_sheet(coData);
    const wsPo = XLSX.utils.json_to_sheet(poData);
    const wsMarks = XLSX.utils.json_to_sheet(rawMarksData);

    XLSX.utils.book_append_sheet(wb, wsCo, 'CO Attainments');
    XLSX.utils.book_append_sheet(wb, wsPo, 'PO Attainments');
    if (rawMarksData.length > 0) {
      XLSX.utils.book_append_sheet(wb, wsMarks, 'Student Marks');
    }

    XLSX.writeFile(wb, `OBE_Analytics_${courseCode}_SEC_${section}.xlsx`);
    showToast('Excel report downloaded', 'success');
  };

  // Export to PDF
  const exportToPDF = () => {
    if (!offeringAttainment || !selectedOffering) return;

    const courseCode = typeof selectedOffering.course === 'object' ? selectedOffering.course.code : selectedOffering.courseCode;
    const courseTitle = typeof selectedOffering.course === 'object' ? selectedOffering.course.title : selectedOffering.courseTitle;
    const batchCode = selectedOffering.batch && typeof selectedOffering.batch === 'object' ? selectedOffering.batch.code : '';
    const section = batchCode ? `${batchCode}_${selectedOffering.section}` : selectedOffering.section;
    const semester = selectedOffering.semesterName;

    const doc = new jsPDF();
    
    // Header
    doc.setFont('courier', 'bold');
    doc.setFontSize(14);
    doc.text('ATLASAI OBE ACADEMIC REPORT', 14, 15);
    
    doc.setFontSize(10);
    doc.setFont('courier', 'normal');
    doc.text(`COURSE: ${courseCode} - ${courseTitle}`, 14, 23);
    doc.text(`SECTION: ${section} | SEMESTER: ${semester}`, 14, 28);
    doc.text(`GENERATED AT: ${new Date().toLocaleString()}`, 14, 33);
    doc.line(14, 35, 196, 35);

    // CO Table
    doc.setFont('courier', 'bold');
    doc.text('COURSE OUTCOME ATTAINMENT', 14, 43);
    
    const coHeaders = [['CO', 'BLOOM LEVEL', 'TOTAL', 'PASSING', 'ATTAINMENT %', 'LEVEL']];
    const coRows = offeringAttainment.coAttainments.map(co => [
      co.co,
      co.bloomLevel.toUpperCase(),
      co.totalStudents.toString(),
      co.passingStudents.toString(),
      `${co.attainmentPct.toFixed(1)}%`,
      co.attainmentLevel.toString(),
    ]);

    autoTable(doc, {
      head: coHeaders,
      body: coRows,
      startY: 47,
      theme: 'grid',
      styles: { font: 'courier', fontSize: 8 },
      headStyles: { fillColor: [24, 24, 27] },
    });

    // PO Table
    const lastY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('courier', 'bold');
    doc.text('PROGRAM OUTCOME ATTAINMENT', 14, lastY);

    const poHeaders = [['PO', 'DESCRIPTION', 'ATTAINMENT SCORE (0-3)']];
    const poRows = offeringAttainment.poAttainments.map(po => [
      po.po,
      po.description,
      po.attainmentScore.toFixed(2),
    ]);

    autoTable(doc, {
      head: poHeaders,
      body: poRows,
      startY: lastY + 4,
      theme: 'grid',
      styles: { font: 'courier', fontSize: 8 },
      headStyles: { fillColor: [24, 24, 27] },
    });

    doc.save(`OBE_Report_${courseCode}_SEC_${section}.pdf`);
    showToast('PDF report downloaded', 'success');
  };

  if (loading) {
    return (
      <DashboardLayout title="Faculty Analytics">
        <div className="text-xs font-mono text-zinc-500 py-10 uppercase">
          Loading analytics selector...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <RoleGuard allowedRoles={["faculty"]}>
      <DashboardLayout title="Faculty Analytics">
        <div className="space-y-6">
          {/* Top Selection & Action Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none">
            <div className="w-full md:w-1/2">
              <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5 font-bold">Select Course Offering</label>
              {offerings.length === 0 ? (
                <div className="text-xs font-mono text-zinc-500 italic uppercase">No offerings assigned.</div>
              ) : (
                <select
                  value={selectedOffering?._id || ''}
                  onChange={(e) => {
                    const found = offerings.find(o => o._id === e.target.value);
                    if (found) setSelectedOffering(found);
                  }}
                  className="block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
                >
                  {offerings.map((o) => {
                    const batchCode = o.batch && typeof o.batch === 'object' ? o.batch.code : '';
                    const secFormatted = batchCode ? `${batchCode}_${o.section}` : o.section;
                    return (
                      <option key={o._id} value={o._id}>
                        {o.courseCode} (SEC {secFormatted}) - {o.semesterName}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
            
            {offeringAttainment && (
              <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 dark:border-zinc-800 font-mono text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> EXCEL
                </button>
                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-1.5 px-3 py-2 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
              </div>
            )}
          </div>

          {/* Loader or Error states */}
          {analyticsLoading && (
            <div className="text-xs font-mono text-zinc-500 py-10 uppercase">
              Computing Outcome-Based Analytics...
            </div>
          )}

          {error === 'CONFIG_REQUIRED' && (
            <div className="p-6 border border-amber-300 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 font-mono rounded-none">
              <h4 className="text-sm font-bold uppercase mb-2">OBE Thresholds Required</h4>
              <p className="text-xs leading-normal">
                OBE analytics cannot be computed because department attainment thresholds have not been configured.
                Please request your Head of Department (HOD) or Admin to configure the threshold sliders.
              </p>
            </div>
          )}

          {!analyticsLoading && offeringAttainment && (
            <div className="space-y-6">
              {/* Row 1: CO Heatmap & CO Attainment Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CO Attainment Heatmap Matrix */}
                <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-4">
                  <h3 className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 uppercase border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    CO-Exam Attainment Heatmap
                  </h3>
                  
                  {exams.length === 0 ? (
                    <p className="text-[10px] font-mono text-zinc-400 uppercase italic">No exams created for this offering.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-center text-xs font-mono border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 dark:bg-zinc-950">
                            <th className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 text-left">CO</th>
                            {exams.map(e => (
                              <th key={e._id} className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 uppercase">{e.name}</th>
                            ))}
                            <th className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 font-bold uppercase">Overall</th>
                          </tr>
                        </thead>
                        <tbody>
                          {offeringAttainment.coAttainments.map((co) => (
                            <tr key={co.co}>
                              <td className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 font-bold text-left">{co.co}</td>
                              {exams.map((exam) => {
                                const examAtt = examAttainments[exam._id];
                                const coAtt = examAtt?.coAttainments.find(c => c.co === co.co);
                                const level = coAtt ? coAtt.attainmentLevel : 0;
                                const isMapped = exam.questions.some(q => q.coMapping && q.coMapping.some(cm => cm.co === co.co));

                                return (
                                  <td
                                    key={exam._id}
                                    className={`px-3 py-2 border border-zinc-200 dark:border-zinc-800 ${
                                      isMapped ? getHeatmapColorClass(level) : 'bg-zinc-100 dark:bg-zinc-950/40 text-zinc-400 dark:text-zinc-650'
                                    }`}
                                  >
                                    {isMapped ? `L${level}` : 'N/A'}
                                  </td>
                                );
                              })}
                              <td className={`px-3 py-2 border border-zinc-200 dark:border-zinc-800 font-bold ${getHeatmapColorClass(co.attainmentLevel)}`}>
                                L{co.attainmentLevel}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Heatmap Legend */}
                  <div className="flex flex-wrap gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 font-mono text-[9px] uppercase text-zinc-400">
                    <div className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 inline-block"></span> Level 3 (Excellent)</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-300 inline-block"></span> Level 2 (Good)</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-300 inline-block"></span> Level 1 (Satisfactory)</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 bg-rose-500 inline-block"></span> Level 0 (Unattained)</div>
                  </div>
                </div>

                {/* CO Attainment Horizontal Bar Chart */}
                <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-4">
                  <h3 className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 uppercase border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    Overall CO Attainment (%)
                  </h3>
                  
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={offeringAttainment.coAttainments}
                        layout="vertical"
                        margin={{ top: 5, right: 10, left: -25, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#27272a" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="co" tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', fontFamily: 'monospace', fontSize: '11px' }}
                          labelStyle={{ color: '#fafafa', fontWeight: 'bold' }}
                          formatter={(value: any) => [`${parseFloat(value).toFixed(1)}%`, 'Passing Students']}
                        />
                        <ReferenceLine x={offeringAttainment.config.studentPassThreshold} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Target', position: 'top', fill: '#ef4444', fontSize: 9 }} />
                        <Bar dataKey="attainmentPct" fill="#10b981" maxBarSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Row 2: PO Radar Chart & Student Accordion */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* PO Attainment Radar Chart */}
                <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-4">
                  <h3 className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 uppercase border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    Program Outcome (PO) Attainment (0-3 Scale)
                  </h3>
                  
                  {offeringAttainment.poAttainments.length === 0 ? (
                    <p className="text-[10px] font-mono text-zinc-400 uppercase italic">No mapped PO attainments available.</p>
                  ) : (
                    <div className="h-64 w-full flex justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={offeringAttainment.poAttainments}>
                          <PolarGrid stroke="#27272a" />
                          <PolarAngleAxis dataKey="po" tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 3]} tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }} />
                          <Radar name="PO Attainment" dataKey="attainmentScore" stroke="#a78bfa" fill="#c084fc" fillOpacity={0.4} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', fontFamily: 'monospace', fontSize: '11px' }}
                            formatter={(value: any) => [`${value} / 3.00`, 'Score']}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* CO-wise Student Status Accordion */}
                <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none space-y-4">
                  <h3 className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 uppercase border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    CO Student Diagnostics
                  </h3>
                  
                  <div className="space-y-2">
                    {offeringAttainment.coAttainments.map((co) => {
                      const isOpen = expandedCo === co.co;
                      const { passed, failed } = getStudentsByCoStatus(co.co);

                      return (
                        <div key={co.co} className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-none">
                          <button
                            onClick={() => toggleCoAccordion(co.co)}
                            className="w-full flex justify-between items-center p-3 font-mono text-xs uppercase hover:bg-zinc-100/50 dark:hover:bg-zinc-800/20 text-left"
                          >
                            <div className="flex gap-2 items-center">
                              <span className="font-bold text-zinc-900 dark:text-zinc-100">{co.co}</span>
                              <span className="text-[10px] text-zinc-400 normal-case">{co.bloomLevel} LEVEL</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold">
                              <span>PASS: {co.passingStudents}/{co.totalStudents}</span>
                              {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </div>
                          </button>

                          {isOpen && (
                            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 font-mono text-[10px] space-y-4">
                              <div className="text-zinc-500 leading-normal uppercase">
                                DESCRIPTION: {co.description}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Passed Column */}
                                <div>
                                  <h4 className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-2">PASSED ({passed.length})</h4>
                                  {passed.length === 0 ? (
                                    <div className="text-zinc-400 italic">NONE</div>
                                  ) : (
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                      {passed.map((s, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-1.5 border border-emerald-500/10 bg-emerald-500/5 text-zinc-700 dark:text-zinc-300">
                                          <span>{s.name} ({s.studentId})</span>
                                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{s.percentage}%</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Failed/Remedial Column */}
                                <div>
                                  <h4 className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase mb-2">NEEDS ATTENTION ({failed.length})</h4>
                                  {failed.length === 0 ? (
                                    <div className="text-zinc-400 italic">NONE</div>
                                  ) : (
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                      {failed.map((s, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-1.5 border border-rose-500/10 bg-rose-500/5 text-zinc-700 dark:text-zinc-300">
                                          <span>{s.name} ({s.studentId})</span>
                                          <span className="font-bold text-rose-600 dark:text-rose-400">{s.percentage}%</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
