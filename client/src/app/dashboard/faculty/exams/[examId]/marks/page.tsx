"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import RoleGuard from '@/components/RoleGuard';
import { useToast } from '@/components/ui/Toast';
import { apiGet, apiPost } from '@/lib/api';
import { IExam, IEnrollment, IStudentMark } from '@/types/api';

export default function FacultyMarksPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const examId = params?.examId as string;

  const [exam, setExam] = useState<IExam | null>(null);
  const [enrollments, setEnrollments] = useState<IEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // gridState maps: studentId -> { questionNumber -> marksObtained }
  const [gridState, setGridState] = useState<{ [studentId: string]: { [qNum: string]: string } }>({});

  // Spreadsheet copy-paste state
  const [showImportModal, setShowImportModal] = useState(false);
  const [pastedData, setPastedData] = useState('');
  const [importDelimiter, setImportDelimiter] = useState('tab'); // 'tab' or 'comma'

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Exam
      const examRes = await apiGet<IExam>(`/exams/${examId}`);
      const examData = examRes.data;
      setExam(examData);

      // 2. Fetch Enrollments
      const offeringId = typeof examData.courseOffering === 'object' ? examData.courseOffering._id : examData.courseOffering;
      const enrollmentsRes = await apiGet<IEnrollment[]>('/enrollments', {
        courseOffering: offeringId,
        limit: 100,
        status: 'active',
      });
      setEnrollments(enrollmentsRes.data || []);

      // 3. Fetch Existing Marks
      const marksRes = await apiGet<IStudentMark[]>(`/marks/exam/${examId}`);
      const existingMarks = marksRes.data || [];

      // 4. Initialize grid state
      const initialGrid: typeof gridState = {};
      
      // Seed with empty values for all enrolled students
      enrollmentsRes.data?.forEach((enrollment) => {
        const sId = typeof enrollment.student === 'object' ? enrollment.student._id : enrollment.student;
        initialGrid[sId] = {};
        examData.questions.forEach((q) => {
          initialGrid[sId][q.number] = '';
        });
      });

      // Populate with existing marks
      existingMarks.forEach((mark) => {
        const sId = typeof mark.student === 'object' ? mark.student._id : mark.student;
        if (initialGrid[sId]) {
          mark.questionMarks.forEach((qm) => {
            initialGrid[sId][qm.question] = qm.marksObtained.toString();
          });
        }
      });

      setGridState(initialGrid);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load marks data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examId) {
      fetchData();
    }
  }, [examId]);

  const handleCellChange = (studentId: string, qNum: string, val: string) => {
    // Basic sanitization: only allow positive floats/integers or empty string
    if (val !== '' && !/^\d*\.?\d*$/.test(val)) {
      return;
    }
    setGridState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [qNum]: val,
      },
    }));
  };

  const getStudentTotal = (studentId: string) => {
    const studentQMarks = gridState[studentId] || {};
    return Object.values(studentQMarks).reduce((sum, val) => {
      const parsed = parseFloat(val);
      return sum + (isNaN(parsed) ? 0 : parsed);
    }, 0);
  };

  const isCellInvalid = (qNum: string, val: string) => {
    if (val === '') return false;
    const parsed = parseFloat(val);
    const question = exam?.questions.find((q) => q.number === qNum);
    if (!question) return false;
    return isNaN(parsed) || parsed < 0 || parsed > question.marks;
  };

  const handleSave = async () => {
    if (!exam) return;

    // Validate all cells before submitting
    const entries = [];
    let hasValidationError = false;

    for (const enrollment of enrollments) {
      const studentId = typeof enrollment.student === 'object' ? enrollment.student._id : enrollment.student;
      const studentName = typeof enrollment.student === 'object' ? enrollment.student.name : 'Student';
      const studentQMarks = gridState[studentId] || {};
      const questionMarksPayload = [];

      for (const q of exam.questions) {
        const val = studentQMarks[q.number] || '';
        if (val === '') {
          // If any field is empty, we don't submit it or we can treat as 0 or throw warning.
          // Let's treat it as 0 but submit it.
          questionMarksPayload.push({ question: q.number, marksObtained: 0 });
          continue;
        }

        const parsed = parseFloat(val);
        if (isNaN(parsed) || parsed < 0 || parsed > q.marks) {
          showToast(`Invalid marks for ${studentName} on Q ${q.number}. Max is ${q.marks}`, 'error');
          hasValidationError = true;
          break;
        }

        questionMarksPayload.push({ question: q.number, marksObtained: parsed });
      }

      if (hasValidationError) {
        return;
      }

      entries.push({
        student: studentId,
        questionMarks: questionMarksPayload,
      });
    }

    if (entries.length === 0) {
      showToast('No student records to save', 'error');
      return;
    }

    setSaving(true);
    try {
      await apiPost('/marks/bulk', {
        exam: examId,
        entries,
      });
      showToast('Marks saved successfully', 'success');
      // Refresh to get clean data and reload pre-calculated totals
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to save marks', 'error');
    } finally {
      setSaving(false);
    }
  };
  const handleImportPasted = () => {
    if (!exam) return;
    if (!pastedData.trim()) {
      showToast('Please paste spreadsheet data first', 'error');
      return;
    }

    const delimiter = importDelimiter === 'tab' ? '\t' : ',';
    const lines = pastedData.split(/\r?\n/);
    const updatedGrid = { ...gridState };
    
    // Map student IDs (e.g. "CSE-055-001") to MongoDB student _ids for fast matching
    const studentIdToMongoIdMap: { [studentIdNum: string]: string } = {};
    enrollments.forEach((e) => {
      if (typeof e.student === 'object') {
        studentIdToMongoIdMap[e.student.studentId.trim().toLowerCase()] = e.student._id;
      }
    });

    let matchedCount = 0;
    let unmatchedCount = 0;
    const unmatchedIDs: string[] = [];

    lines.forEach((line) => {
      if (!line.trim()) return;

      const cols = line.split(delimiter).map(c => c.trim());
      if (cols.length === 0 || !cols[0]) return;

      const rawStudentId = cols[0].toLowerCase();
      const mongoId = studentIdToMongoIdMap[rawStudentId];

      if (mongoId) {
        matchedCount++;
        // Import question marks in columns 1, 2, 3...
        exam.questions.forEach((q, idx) => {
          const colValue = cols[idx + 1];
          if (colValue !== undefined && colValue !== '') {
            const parsedVal = parseFloat(colValue);
            if (!isNaN(parsedVal)) {
              if (!updatedGrid[mongoId]) updatedGrid[mongoId] = {};
              updatedGrid[mongoId][q.number] = parsedVal.toString();
            }
          }
        });
      } else {
        unmatchedCount++;
        unmatchedIDs.push(cols[0]);
      }
    });

    setGridState(updatedGrid);
    setShowImportModal(false);
    setPastedData('');

    if (matchedCount > 0) {
      showToast(`Successfully parsed and matched ${matchedCount} students from spreadsheet!`, 'success');
    }
    if (unmatchedCount > 0) {
      showToast(`Could not match ${unmatchedCount} student IDs: ${unmatchedIDs.slice(0, 3).join(', ')}${unmatchedIDs.length > 3 ? '...' : ''}`, 'error');
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Marks Entry">
        <div className="text-xs font-mono text-zinc-500 py-10 uppercase">
          Loading marks entry grid...
        </div>
      </DashboardLayout>
    );
  }

  if (!exam) {
    return (
      <DashboardLayout title="Marks Entry">
        <div className="p-4 border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-mono uppercase">
          Exam not found.
        </div>
      </DashboardLayout>
    );
  }

  const offeringName = exam.courseOffering && typeof exam.courseOffering === 'object' 
    ? `${exam.courseOffering.courseCode} (SEC ${exam.courseOffering.batch && typeof exam.courseOffering.batch === 'object' ? `${exam.courseOffering.batch.code}_${exam.courseOffering.section}` : exam.courseOffering.section})`
    : 'Course Offering';

  return (
    <RoleGuard allowedRoles={["faculty"]}>
      <DashboardLayout title="Marks Entry">
        <div className="space-y-6">
          {/* Header Action Info Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none">
            <div className="font-mono">
              <h2 className="text-sm font-bold uppercase text-zinc-900 dark:text-zinc-50">
                {exam.name} Marks Entry
              </h2>
              <p className="text-[10px] text-zinc-500 uppercase mt-1">
                Course: {offeringName} | Total Marks: {exam.totalMarks}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button
                onClick={() => router.back()}
                className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 font-mono text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                BACK
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-3 py-2 border border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
              >
                PASTE FROM SPREADSHEET
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-2 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 cursor-pointer uppercase"
              >
                {saving ? 'SAVING...' : 'SAVE ALL MARKS'}
              </button>
            </div>
          </div>

          {/* Grid Panel */}
          <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none">
            {enrollments.length === 0 ? (
              <div className="text-xs font-mono text-zinc-500 py-6 uppercase italic text-center">
                No active students enrolled in this course offering.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-4 py-3 font-semibold uppercase border border-zinc-200 dark:border-zinc-800 min-w-48">Student Info</th>
                      <th className="px-4 py-3 font-semibold uppercase border border-zinc-200 dark:border-zinc-800 min-w-36 text-center">Student ID</th>
                      {exam.questions.map((q) => (
                        <th key={q.number} className="px-4 py-3 font-semibold uppercase border border-zinc-200 dark:border-zinc-800 text-center min-w-24">
                          <div>Q {q.number}</div>
                          <div className="text-[9px] text-zinc-400 normal-case">Max: {q.marks}</div>
                        </th>
                      ))}
                      <th className="px-4 py-3 font-semibold uppercase border border-zinc-200 dark:border-zinc-800 text-center min-w-24 bg-zinc-100 dark:bg-zinc-900">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {enrollments.map((enrollment) => {
                      const studentObj = typeof enrollment.student === 'object' ? enrollment.student : null;
                      const sId = studentObj?._id || enrollment.student as string;
                      const studentName = studentObj?.name || 'N/A';
                      const studentIdNum = studentObj?.studentId || 'N/A';

                      return (
                        <tr key={sId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 uppercase">
                            {studentName}
                          </td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 text-center">
                            {studentIdNum}
                          </td>
                          {exam.questions.map((q) => {
                            const val = gridState[sId]?.[q.number] || '';
                            const invalid = isCellInvalid(q.number, val);

                            return (
                              <td key={q.number} className="p-1 border border-zinc-200 dark:border-zinc-800 text-center">
                                <input
                                  type="text"
                                  value={val}
                                  placeholder="0"
                                  onChange={(e) => handleCellChange(sId, q.number, e.target.value)}
                                  className={`w-full text-center py-1.5 px-2 bg-transparent font-mono text-xs focus:outline-none border ${
                                    invalid
                                      ? 'border-red-500 text-red-600 dark:text-red-400 bg-red-500/10'
                                      : 'border-transparent focus:border-zinc-400 dark:focus:border-zinc-600 text-zinc-900 dark:text-zinc-100'
                                  }`}
                                />
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-center border border-zinc-200 dark:border-zinc-800 font-bold bg-zinc-50 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100">
                            {getStudentTotal(sId).toFixed(1)} / {exam.totalMarks}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Copy-Paste Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-2xl border border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 p-6 rounded-none shadow-xl font-mono text-xs">
              <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-4">
                <h3 className="text-sm font-bold uppercase text-zinc-900 dark:text-zinc-50">Paste Spreadsheet Data</h3>
                <button
                  onClick={() => { setShowImportModal(false); setPastedData(''); }}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  [CLOSE]
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-none text-[10px] leading-relaxed uppercase text-zinc-500">
                  <p className="font-bold text-zinc-700 dark:text-zinc-300">Format instructions:</p>
                  <p className="mt-1">1. Copy rows directly from Excel or Google Sheets.</p>
                  <p>2. Column 1 must be the Student ID (e.g., CSE-055-001).</p>
                  <p>3. Subsequent columns must be marks for Q {exam.questions.map(q => q.number).join(', ')} in that order.</p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-zinc-400 uppercase">DELIMITER:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="delimiter"
                      checked={importDelimiter === 'tab'}
                      onChange={() => setImportDelimiter('tab')}
                      className="h-3 w-3 border border-zinc-300 bg-white dark:bg-zinc-950 focus:outline-none"
                    />
                    <span>TAB (EXCEL/GOOGLE SHEETS)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="delimiter"
                      checked={importDelimiter === 'comma'}
                      onChange={() => setImportDelimiter('comma')}
                      className="h-3 w-3 border border-zinc-300 bg-white dark:bg-zinc-950 focus:outline-none"
                    />
                    <span>COMMA (CSV)</span>
                  </label>
                </div>

                <div>
                  <textarea
                    rows={10}
                    value={pastedData}
                    onChange={(e) => setPastedData(e.target.value)}
                    placeholder="Paste data here...&#10;CSE-055-001	4.5	9.0	12.5&#10;CSE-055-002	3.0	8.0	10.0"
                    className="w-full p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-3">
                  <button
                    onClick={() => { setShowImportModal(false); setPastedData(''); }}
                    className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleImportPasted}
                    className="px-3 py-2 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
                  >
                    PARSE & IMPORT
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </RoleGuard>
  );
}
