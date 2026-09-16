"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { DataTable, ColumnConfig } from '@/components/ui/DataTable';
import { FormModal } from '@/components/ui/FormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { ISectionAssignment, ISemester, IBatch, IUser, PaginationMeta } from '@/types/api';

export default function SectionAssignmentsPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<ISectionAssignment[]>([]);
  const [semesters, setSemesters] = useState<ISemester[]>([]);
  const [batches, setBatches] = useState<IBatch[]>([]);
  const [students, setStudents] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ISectionAssignment | null>(null);

  // Single Form fields
  const [studentId, setStudentId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [section, setSection] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Bulk Form fields
  const [bulkSemesterId, setBulkSemesterId] = useState('');
  const [bulkBatchId, setBulkBatchId] = useState('');
  const [bulkSection, setBulkSection] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const fetchSectionAssignments = async () => {
    setLoading(true);
    try {
      const response = await apiGet<ISectionAssignment[]>('/section-assignments', {
        page,
        limit: 10,
        search: search || undefined,
      });
      setData(response.data);
      setMeta(response.meta);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to fetch section assignments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [semsRes, batchesRes, studentsRes] = await Promise.all([
        apiGet<ISemester[]>('/semesters', { limit: 100 }),
        apiGet<IBatch[]>('/batches', { limit: 100 }),
        apiGet<IUser[]>('/admin/users', { role: 'student' }),
      ]);
      setSemesters(semsRes.data);
      setBatches(batchesRes.data);
      setStudents(studentsRes.data);
    } catch (err) {
      console.error('Failed to fetch dependencies', err);
    }
  };

  useEffect(() => {
    fetchSectionAssignments();
    fetchDependencies();
  }, [page, search]);

  const openCreateModal = () => {
    setSelectedAssignment(null);
    setStudentId('');
    setSemesterId(semesters.find(s => s.status === 'active')?._id || semesters[0]?._id || '');
    setBatchId(batches[0]?._id || '');
    setSection('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openBulkModal = () => {
    setBulkSemesterId(semesters.find(s => s.status === 'active')?._id || semesters[0]?._id || '');
    setBulkBatchId(batches[0]?._id || '');
    setBulkSection('');
    setSelectedStudentIds([]);
    setFormError(null);
    setIsBulkOpen(true);
  };

  const openDeleteConfirm = (assign: ISectionAssignment) => {
    setSelectedAssignment(assign);
    setIsDeleteOpen(true);
  };

  // Get active batch sections for form dropdowns
  const currentBatchId = isBulkOpen ? bulkBatchId : batchId;
  const currentBatchObj = batches.find(b => b._id === currentBatchId);
  const availableSections = currentBatchObj?.sections || [];

  const handleStudentCheckboxChange = (sId: string) => {
    if (selectedStudentIds.includes(sId)) {
      setSelectedStudentIds(selectedStudentIds.filter(id => id !== sId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, sId]);
    }
  };

  const handleSubmit = async () => {
    setSubmitLoading(true);
    setFormError(null);
    try {
      if (!studentId) throw new Error('Student is required');
      if (!semesterId) throw new Error('Semester is required');
      if (!batchId) throw new Error('Batch is required');
      if (!section) throw new Error('Section is required');

      await apiPost('/section-assignments', {
        student: studentId,
        semester: semesterId,
        batch: batchId,
        section,
      });

      showToast('Section assigned successfully', 'success');
      setIsFormOpen(false);
      fetchSectionAssignments();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'An error occurred');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    setSubmitLoading(true);
    setFormError(null);
    try {
      if (!bulkSemesterId) throw new Error('Semester is required');
      if (!bulkBatchId) throw new Error('Batch is required');
      if (!bulkSection) throw new Error('Section is required');
      if (selectedStudentIds.length === 0) throw new Error('At least one student must be selected');

      await apiPost('/section-assignments/bulk', {
        semester: bulkSemesterId,
        batch: bulkBatchId,
        section: bulkSection,
        students: selectedStudentIds,
      });

      showToast('Bulk section assignment completed successfully', 'success');
      setIsBulkOpen(false);
      fetchSectionAssignments();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'An error occurred');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAssignment) return;
    setSubmitLoading(true);
    try {
      await apiDelete(`/section-assignments/${selectedAssignment._id}`);
      showToast('Section assignment removed successfully', 'success');
      setIsDeleteOpen(false);
      fetchSectionAssignments();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to remove assignment', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Filter students based on selected batch (matching batch code/name)
  const filteredStudents = students.filter(s => {
    if (!bulkBatchId) return true;
    const batchObj = batches.find(b => b._id === bulkBatchId);
    return s.batch === batchObj?.code;
  });

  const columns: ColumnConfig<ISectionAssignment>[] = [
    {
      key: 'student',
      label: 'Student Name',
      render: (item) => item.student?.name || '-'
    },
    {
      key: 'studentId',
      label: 'Student ID',
      render: (item) => item.student?.studentId || '-'
    },
    {
      key: 'semesterName',
      label: 'Semester',
      render: (item) => (item.semester && typeof item.semester === 'object') ? item.semester.name : (item.semester || '-')
    },
    {
      key: 'batch',
      label: 'Batch',
      render: (item) => (item.batch && typeof item.batch === 'object') ? item.batch.code : (item.batch || '-')
    },
    {
      key: 'section',
      label: 'Section',
      render: (item) => {
        const batchCode = item.batch && typeof item.batch === 'object' ? item.batch.code : '';
        return batchCode ? `${batchCode}_${item.section}` : item.section;
      }
    }
  ];

  return (
    <DashboardLayout title="Section Assignments">
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search assignment logs..."
        onDelete={openDeleteConfirm}
        topActions={
          <div className="flex gap-2">
            <button
              onClick={openBulkModal}
              className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono text-xs font-semibold hover:border-zinc-900 dark:hover:border-zinc-100 cursor-pointer"
            >
              BULK ASSIGN
            </button>
            <button
              onClick={openCreateModal}
              className="px-3 py-2 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
            >
              ASSIGN STUDENT
            </button>
          </div>
        }
      />

      {/* Single Assign Modal */}
      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Assign Section"
        onSubmit={handleSubmit}
        loading={submitLoading}
      >
        {formError && (
          <div className="p-3 border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-mono">
            {formError.toUpperCase()}
          </div>
        )}

        <FormField label="Select Student">
          <select
            value={studentId}
            required
            onChange={(e) => setStudentId(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
          >
            <option value="">SELECT STUDENT</option>
            {students.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} ({s.studentId || s.email})
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Semester">
            <select
              value={semesterId}
              required
              onChange={(e) => setSemesterId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
            >
              <option value="">SELECT SEMESTER</option>
              {semesters.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Batch">
            <select
              value={batchId}
              required
              onChange={(e) => {
                setBatchId(e.target.value);
                setSection('');
              }}
              className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
            >
              <option value="">SELECT BATCH</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Section">
          <select
            value={section}
            required
            disabled={!batchId}
            onChange={(e) => setSection(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none disabled:opacity-50"
          >
            <option value="">SELECT SECTION</option>
            {availableSections.map((sec) => {
              const selectedBatchCode = currentBatchObj?.code || '';
              const label = selectedBatchCode ? `${selectedBatchCode}_${sec}` : sec;
              return (
                <option key={sec} value={sec}>
                  {label}
                </option>
              );
            })}
          </select>
        </FormField>
      </FormModal>

      {/* Bulk Assign Modal */}
      <FormModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        title="Bulk Assign Students to Section"
        onSubmit={handleBulkSubmit}
        loading={submitLoading}
        size="lg"
      >
        {formError && (
          <div className="p-3 border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-mono">
            {formError.toUpperCase()}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField label="Semester">
            <select
              value={bulkSemesterId}
              required
              onChange={(e) => setBulkSemesterId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
            >
              <option value="">SELECT SEMESTER</option>
              {semesters.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Batch">
            <select
              value={bulkBatchId}
              required
              onChange={(e) => {
                setBulkBatchId(e.target.value);
                setBulkSection('');
                setSelectedStudentIds([]);
              }}
              className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
            >
              <option value="">SELECT BATCH</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Section">
            <select
              value={bulkSection}
              required
              disabled={!bulkBatchId}
              onChange={(e) => setBulkSection(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none disabled:opacity-50"
            >
              <option value="">SELECT SECTION</option>
              {availableSections.map((sec) => {
                const selectedBatchCode = currentBatchObj?.code || '';
                const label = selectedBatchCode ? `${selectedBatchCode}_${sec}` : sec;
                return (
                  <option key={sec} value={sec}>
                    {label}
                  </option>
                );
              })}
            </select>
          </FormField>
        </div>

        {/* Checkbox list of batch students */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
          <h4 className="text-xs font-mono font-bold tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">
            Select Students to Assign
          </h4>
          
          {filteredStudents.length === 0 ? (
            <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase italic">
              No students found for this batch. Assign user roles first!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 bg-zinc-50/50 dark:bg-zinc-900/30 border border-dashed border-zinc-200 dark:border-zinc-800">
              {filteredStudents.map((stud) => {
                const isChecked = selectedStudentIds.includes(stud._id);
                return (
                  <label
                    key={stud._id}
                    className={`flex items-center space-x-3 p-2.5 border cursor-pointer select-none transition-colors ${
                      isChecked 
                        ? 'bg-white dark:bg-zinc-950 border-zinc-900 dark:border-zinc-100' 
                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleStudentCheckboxChange(stud._id)}
                      className="h-3.5 w-3.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none cursor-pointer"
                    />
                    <div className="font-mono text-[10px] uppercase leading-tight">
                      <div className="font-bold text-zinc-850 dark:text-zinc-200">{stud.name}</div>
                      <div className="text-zinc-400">ID: {stud.studentId || '-'}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </FormModal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Remove Section Assignment"
        message={`Are you sure you want to remove the section assignment for student "${selectedAssignment?.student?.name || ''}"?`}
        loading={submitLoading}
      />
    </DashboardLayout>
  );
}
