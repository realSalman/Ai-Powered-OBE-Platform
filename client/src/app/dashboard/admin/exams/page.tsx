"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { DataTable, ColumnConfig } from '@/components/ui/DataTable';
import { FormModal } from '@/components/ui/FormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { IExam, ICourseOffering, ICourse, IQuestion, PaginationMeta } from '@/types/api';
import { useRouter } from 'next/navigation';

export default function ExamsPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [data, setData] = useState<IExam[]>([]);
  const [offerings, setOfferings] = useState<ICourseOffering[]>([]);
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedExam, setSelectedExam] = useState<IExam | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [totalMarks, setTotalMarks] = useState(25);
  const [cosCovered, setCosCovered] = useState<string[]>([]);
  const [offeringId, setOfferingId] = useState('');
  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);


  const fetchExams = async () => {
    setLoading(true);
    try {
      const response = await apiGet<IExam[]>('/exams', {
        page,
        limit: 10,
        search: search || undefined,
      });
      setData(response.data);
      setMeta(response.meta);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to fetch exams', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [offeringsRes, coursesRes] = await Promise.all([
        apiGet<ICourseOffering[]>('/offerings', { limit: 100 }),
        apiGet<ICourse[]>('/courses', { limit: 100 }),
      ]);
      setOfferings(offeringsRes.data);
      setCourses(coursesRes.data);
    } catch (err) {
      console.error('Failed to fetch dependencies', err);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchDependencies();
  }, [page, search]);

  // Resolves the Course Outcomes (COs) for the currently selected offering
  const getSelectedOfferingCOs = () => {
    const targetOfferingId = selectedExam ? offeringId : offeringId;
    const offeringObj = offerings.find(o => o._id === targetOfferingId);
    if (!offeringObj) return [];
    
    const courseId = offeringObj.course && typeof offeringObj.course === 'object' ? offeringObj.course._id : (offeringObj.course || '');
    const courseObj = courses.find(c => c._id === courseId);
    return courseObj?.courseOutcomes || [];
  };

  const getSelectedCourseType = () => {
    const targetOfferingId = selectedExam ? offeringId : offeringId;
    const offeringObj = offerings.find(o => o._id === targetOfferingId);
    if (!offeringObj) return 'theory';
    
    const courseId = offeringObj.course && typeof offeringObj.course === 'object' ? offeringObj.course._id : (offeringObj.course || '');
    const courseObj = courses.find(c => c._id === courseId);
    return courseObj?.type || 'theory';
  };

  const availableCOs = getSelectedOfferingCOs();
  const courseType = getSelectedCourseType();

  const openCreateModal = () => {
    setSelectedExam(null);
    setName('');
    setTotalMarks(25);
    setCosCovered([]);
    setOfferingId(offerings[0]?._id || '');
    setQuestions([]);
    setIsActive(true);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (exam: IExam) => {
    setSelectedExam(exam);
    setName(exam.name);
    setTotalMarks(exam.totalMarks);
    setCosCovered(exam.cosCovered || []);
    
    const offId = exam.courseOffering && typeof exam.courseOffering === 'object' ? exam.courseOffering._id : (exam.courseOffering || '');
    setOfferingId(offId);
    
    setQuestions(exam.questions || []);
    setIsActive(exam.isActive);
    setFormError(null);
    setIsFormOpen(true);
  };



  const openDeleteConfirm = (exam: IExam) => {
    setSelectedExam(exam);
    setIsDeleteOpen(true);
  };

  // Questions array helpers
  const handleAddQuestion = () => {
    if (availableCOs.length === 0) {
      showToast('Select an offering with course outcomes first', 'error');
      return;
    }
    const defaultCo = availableCOs[0]?.code || '';
    if (defaultCo && !cosCovered.includes(defaultCo)) {
      setCosCovered([...cosCovered, defaultCo]);
    }
    setQuestions([...questions, { number: `Q${questions.length + 1}`, marks: 5, coMapping: [{ co: defaultCo, percentage: 100 }] } as any]);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: keyof IQuestion, val: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: val } as IQuestion;
    setQuestions(updated);
  };

  const handleCoToggle = (coCode: string) => {
    if (cosCovered.includes(coCode)) {
      setCosCovered(cosCovered.filter(c => c !== coCode));
    } else {
      setCosCovered([...cosCovered, coCode]);
    }
  };

  const handleSubmit = async () => {
    setSubmitLoading(true);
    setFormError(null);
    try {
      if (!name.trim()) throw new Error('Exam name is required');
      
      // Auto-compute finalCosCovered from questions if questions exist, otherwise use manual checkboxes
      let finalCosCovered = [...cosCovered];
      if (questions.length > 0) {
        const questionCos = new Set<string>();
        questions.forEach(q => {
          if (q.coMapping) {
            q.coMapping.forEach(m => {
              if (m.co) questionCos.add(m.co);
            });
          }
        });
        finalCosCovered = Array.from(questionCos).sort();
      }

      if (finalCosCovered.length === 0) {
        throw new Error('Select at least one Course Outcome covered or add questions');
      }
      
      // Question validation
      for (const q of questions) {
        if (!q.number.trim()) throw new Error('Question number is required');
        if (q.marks <= 0) throw new Error('Question marks must be positive');
        if (!q.coMapping || q.coMapping.length === 0) {
          throw new Error(`Question ${q.number} must have at least one CO mapped`);
        }
        const totalPct = q.coMapping.reduce((s, e) => s + e.percentage, 0);
        if (totalPct !== 100) {
          throw new Error(`Question ${q.number} CO percentages must sum to exactly 100% (currently ${totalPct}%)`);
        }
      }

      const payload = {
        name: name.trim(),
        totalMarks: Number(totalMarks),
        cosCovered: finalCosCovered,
        courseOffering: offeringId,
        questions: questions.map(q => ({
          ...q,
          marks: Number(q.marks),
        })),
        isActive,
      };

      if (selectedExam) {
        await apiPut(`/exams/${selectedExam._id}`, payload);
        showToast('Exam updated successfully', 'success');
      } else {
        await apiPost('/exams', payload);
        showToast('Exam created successfully', 'success');
      }

      setIsFormOpen(false);
      fetchExams();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'An error occurred');
    } finally {
      setSubmitLoading(false);
    }
  };



  const handleDelete = async () => {
    if (!selectedExam) return;
    setSubmitLoading(true);
    try {
      await apiDelete(`/exams/${selectedExam._id}`);
      showToast('Exam deleted successfully', 'success');
      setIsDeleteOpen(false);
      fetchExams();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete exam', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const columns: ColumnConfig<IExam>[] = [
    { key: 'name', label: 'Exam Name' },
    {
      key: 'courseOffering',
      label: 'Course Offering',
      render: (item) => {
        if (item.courseOffering && typeof item.courseOffering === 'object') {
          const batchCode = item.courseOffering.batch && typeof item.courseOffering.batch === 'object' ? item.courseOffering.batch.code : '';
          const secFormatted = batchCode ? `${batchCode}_${item.courseOffering.section}` : item.courseOffering.section;
          return `${item.courseOffering.courseCode} - SEC ${secFormatted}`;
        }
        return item.courseOffering;
      }
    },
    {
      key: 'semester',
      label: 'Semester',
      render: (item) => {
        if (typeof item.courseOffering === 'object') {
          return item.courseOffering.semesterName;
        }
        return '-';
      }
    },
    { key: 'totalMarks', label: 'Marks', render: (item) => `${item.totalMarks}` },
    { key: 'cosCovered', label: 'COs Covered', render: (item) => item.cosCovered?.join(', ') || '-' },
    {
      key: 'questions',
      label: 'Q Count',
      render: (item) => item.questions?.length || 0
    }
  ];

  return (
    <DashboardLayout title="Exams">
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search exams..."
        onEdit={openEditModal}
        onDelete={openDeleteConfirm}
        extraActions={(item) => (
          <button
            onClick={() => router.push(`/dashboard/admin/exams/${item._id}/marks`)}
            className="px-2 py-1 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-[10px] font-mono uppercase tracking-tight hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
          >
            MARKS
          </button>
        )}
        topActions={
          <div className="flex gap-2">

            <button
              onClick={openCreateModal}
              className="px-3 py-2 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
            >
              NEW EXAM
            </button>
          </div>
        }
      />

      {/* Create/Edit Form Modal */}
      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedExam ? "Edit Exam" : "New Exam"}
        onSubmit={handleSubmit}
        loading={submitLoading}
        size="lg"
      >
        {formError && (
          <div className="p-3 border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-mono">
            {formError.toUpperCase()}
          </div>
        )}

        {selectedExam ? (
          // View-only info of offering
          <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 font-mono text-[10px] space-y-1 text-zinc-500 uppercase">
            <div>COURSE OFFERING: {selectedExam.courseOffering && typeof selectedExam.courseOffering === 'object' ? `${selectedExam.courseOffering.courseCode} SEC ${selectedExam.courseOffering.batch && typeof selectedExam.courseOffering.batch === 'object' ? `${selectedExam.courseOffering.batch.code}_${selectedExam.courseOffering.section}` : selectedExam.courseOffering.section}` : selectedExam.courseOffering}</div>
          </div>
        ) : (
          <FormField label="Course Offering">
            <select
              value={offeringId}
              required
              onChange={(e) => {
                setOfferingId(e.target.value);
                setCosCovered([]);
                setQuestions([]);
              }}
              className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
            >
              <option value="">SELECT COURSE OFFERING</option>
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
          </FormField>
        )}

        {courseType === 'theory' ? (
          <FormField label="Exam Type" hint="Select the exam type for this theory course">
            <select
              value={name}
              required
              onChange={(e) => {
                const val = e.target.value;
                setName(val);
                if (val === 'Mid') setTotalMarks(25);
                else if (val === 'Final') setTotalMarks(40);
                else if (val === 'Quiz 1' || val === 'Quiz 2' || val === 'Quiz 3') setTotalMarks(15);
              }}
              className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
            >
              <option value="">SELECT EXAM TYPE</option>
              <option value="Mid">Mid (25 Marks)</option>
              <option value="Final">Final (40 Marks)</option>
              <option value="Quiz 1">Quiz 1 (15 Marks)</option>
              <option value="Quiz 2">Quiz 2 (15 Marks)</option>
              <option value="Quiz 3">Quiz 3 (15 Marks)</option>
            </select>
          </FormField>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Exam Name" hint="e.g. Lab Final, Project Viva">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
              />
            </FormField>

            <FormField label="Total Marks" hint="0 to 200">
              <input
                type="number"
                required
                min="0"
                max="200"
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-black text-white dark:bg-black dark:text-white font-mono text-xs focus:outline-none"
              />
            </FormField>
          </div>
        )}

        {/* COs Covered multi selector */}
        <FormField label="COs Covered" hint="Select course outcomes evaluated in this exam">
          <div className="flex flex-wrap gap-2 mt-1.5 bg-zinc-50 dark:bg-zinc-950/20 p-2.5 border border-zinc-200 dark:border-zinc-800 min-h-10">
            {availableCOs.length === 0 ? (
              <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase italic">
                Please select a course offering to load outcomes.
              </p>
            ) : (
              availableCOs.map(co => {
                const isChecked = cosCovered.includes(co.code);
                return (
                  <button
                    key={co.code}
                    type="button"
                    onClick={() => handleCoToggle(co.code)}
                    className={`px-2 py-0.5 border text-[10px] font-mono transition-colors ${
                      isChecked 
                        ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900' 
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-400'
                    }`}
                  >
                    {co.code} ({co.bloomLevel})
                  </button>
                );
              })
            )}
          </div>
        </FormField>

        {/* Questions Array Editor */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-mono font-bold tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">
              Questions Breakdowns
            </h4>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="px-2 py-1 border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono uppercase hover:border-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:text-zinc-300 cursor-pointer"
            >
              + Add Question
            </button>
          </div>

          {questions.length === 0 ? (
            <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase italic">
              No individual questions added.
            </p>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {questions.map((q, index) => (
                <div key={index} className="flex gap-4 items-end border border-dashed border-zinc-200 dark:border-zinc-800 p-2.5 bg-zinc-50/50 dark:bg-zinc-900/30">
                  <div className="w-24">
                    <label className="block text-[9px] font-mono text-zinc-400">Q NO.</label>
                    <input
                      type="text"
                      required
                      value={q.number}
                      placeholder="e.g. 1.a"
                      onChange={(e) => handleQuestionChange(index, 'number', e.target.value)}
                      className="mt-1 block w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-[9px] font-mono text-zinc-400">MARKS</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={q.marks}
                      onChange={(e) => handleQuestionChange(index, 'marks', Number(e.target.value))}
                      className="mt-1 block w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
                    />
                  </div>
                    <div className="flex-1 space-y-2">
                      <div>
                        <label className="block text-[9px] font-mono text-zinc-400">CO MAPPING TYPE</label>
                        <select
                          value={
                            q.coMapping && q.coMapping.length === 1 && q.coMapping[0].percentage === 100
                              ? q.coMapping[0].co
                              : "_custom"
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "_custom") {
                              const initialCustom = cosCovered.map((c, i) => ({ co: c, percentage: i === 0 ? 100 : 0 }));
                              handleQuestionChange(index, 'coMapping', initialCustom);
                            } else {
                              handleQuestionChange(index, 'coMapping', [{ co: val, percentage: 100 }]);
                            }
                          }}
                          className="mt-1 block w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
                        >
                          {cosCovered.length === 0 ? (
                            <option value="">SELECT MAPPED CO (NONE SELECTED ABOVE)</option>
                          ) : (
                            <>
                              {cosCovered.map(code => (
                                <option key={code} value={code}>SINGLE CO: {code} (100%)</option>
                              ))}
                              <option value="_custom">MULTIPLE COs (CUSTOM %)</option>
                            </>
                          )}
                        </select>
                      </div>

                      {/* Custom mapping editor if _custom is selected */}
                      {(!q.coMapping || q.coMapping.length > 1 || (q.coMapping.length === 1 && q.coMapping[0].percentage !== 100)) && (
                        <div className="p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-1.5">
                          <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">Set CO Percentages</div>
                          {cosCovered.map((coCode) => {
                            const mapping = q.coMapping?.find(m => m.co === coCode);
                            const val = mapping ? mapping.percentage : 0;
                            return (
                              <div key={coCode} className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 font-semibold">{coCode}</span>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={val || ""}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const newPct = Number(e.target.value) || 0;
                                      const updated = (q.coMapping || []).filter(m => m.co !== coCode);
                                      if (newPct > 0) {
                                        updated.push({ co: coCode, percentage: newPct });
                                      }
                                      handleQuestionChange(index, 'coMapping', updated);
                                    }}
                                    className="w-14 px-1.5 py-0.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono text-[10px] focus:outline-none"
                                  />
                                  <span className="text-[10px] text-zinc-400 font-mono">%</span>
                                </div>
                              </div>
                            );
                          })}
                          <div className="text-[9px] font-mono text-right font-bold uppercase mt-1">
                            {(() => {
                              const total = q.coMapping?.reduce((sum, item) => sum + item.percentage, 0) || 0;
                              return (
                                <span className={total === 100 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                  SUM: {total}% {total === 100 ? "✓" : "(!= 100%)"}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(index)}
                    className="px-2 py-1 border border-red-200 dark:border-red-950 text-[10px] font-mono text-red-600 dark:text-red-400 hover:border-red-500 cursor-pointer"
                  >
                    [X]
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedExam && (
          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-3.5 w-3.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none cursor-pointer"
            />
            <label htmlFor="isActive" className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
              EXAM IS ACTIVE
            </label>
          </div>
        )}
      </FormModal>



      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Exam"
        message={`Are you sure you want to delete exam "${selectedExam?.name || ''}"? This will delete all marks associated with this exam.`}
        loading={submitLoading}
      />
    </DashboardLayout>
  );
}
