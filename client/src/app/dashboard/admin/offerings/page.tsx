"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { DataTable, ColumnConfig } from '@/components/ui/DataTable';
import { FormModal } from '@/components/ui/FormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { ICourseOffering, ICourse, ISemester, IBatch, IUser, PaginationMeta } from '@/types/api';

export default function OfferingsPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<ICourseOffering[]>([]);
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [semesters, setSemesters] = useState<ISemester[]>([]);
  const [batches, setBatches] = useState<IBatch[]>([]);
  const [teachers, setTeachers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedOffering, setSelectedOffering] = useState<ICourseOffering | null>(null);

  // Single Form fields
  const [courseId, setCourseId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [section, setSection] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Bulk Form fields
  const [bulkSemesterId, setBulkSemesterId] = useState('');
  const [bulkBatchId, setBulkBatchId] = useState('');
  const [bulkRows, setBulkRows] = useState<{ course: string; section: string; teacher: string }[]>([
    { course: '', section: '', teacher: '' }
  ]);

  const fetchOfferings = async () => {
    setLoading(true);
    try {
      const response = await apiGet<ICourseOffering[]>('/offerings', {
        page,
        limit: 10,
        search: search || undefined,
      });
      setData(response.data);
      setMeta(response.meta);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to fetch offerings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [coursesRes, semsRes, batchesRes, teachersRes] = await Promise.all([
        apiGet<ICourse[]>('/courses', { limit: 100 }),
        apiGet<ISemester[]>('/semesters', { limit: 100 }),
        apiGet<IBatch[]>('/batches', { limit: 100 }),
        apiGet<IUser[]>('/admin/users', { role: 'faculty' }),
      ]);
      setCourses(coursesRes.data);
      setSemesters(semsRes.data);
      setBatches(batchesRes.data);
      setTeachers(teachersRes.data);
    } catch (err) {
      console.error('Failed to fetch dependencies', err);
    }
  };

  useEffect(() => {
    fetchOfferings();
    fetchDependencies();
  }, [page, search]);

  const openCreateModal = () => {
    setSelectedOffering(null);
    setCourseId('');
    setSemesterId(semesters.find(s => s.status === 'active')?._id || semesters[0]?._id || '');
    setBatchId(batches[0]?._id || '');
    setSection('');
    setTeacherId('');
    setIsActive(true);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (offering: ICourseOffering) => {
    setSelectedOffering(offering);
    
    // Core fields cannot be edited, but set them for display/visual aid
    setCourseId(offering.course && typeof offering.course === 'object' ? offering.course._id : (offering.course || ''));
    setSemesterId(offering.semester && typeof offering.semester === 'object' ? offering.semester._id : (offering.semester || ''));
    setBatchId(offering.batch && typeof offering.batch === 'object' ? offering.batch._id : (offering.batch || ''));
    setSection(offering.section);
    
    setTeacherId(offering.teacher ? (typeof offering.teacher === 'object' ? offering.teacher._id : offering.teacher) : '');
    setIsActive(offering.isActive);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openBulkModal = () => {
    setBulkSemesterId(semesters.find(s => s.status === 'active')?._id || semesters[0]?._id || '');
    setBulkBatchId(batches[0]?._id || '');
    setBulkRows([{ course: '', section: '', teacher: '' }]);
    setFormError(null);
    setIsBulkOpen(true);
  };

  const openDeleteConfirm = (offering: ICourseOffering) => {
    setSelectedOffering(offering);
    setIsDeleteOpen(true);
  };

  // Get available sections for the selected batch
  const selectedBatchObj = batches.find((b) => b._id === (selectedOffering ? batchId : (isBulkOpen ? bulkBatchId : batchId)));
  const availableSections = selectedBatchObj?.sections || [];

  const handleAddBulkRow = () => {
    setBulkRows([...bulkRows, { course: '', section: '', teacher: '' }]);
  };

  const handleRemoveBulkRow = (index: number) => {
    setBulkRows(bulkRows.filter((_, i) => i !== index));
  };

  const handleBulkRowChange = (index: number, field: string, val: string) => {
    const updated = [...bulkRows];
    updated[index] = { ...updated[index], [field]: val };
    setBulkRows(updated);
  };

  const handleSubmit = async () => {
    setSubmitLoading(true);
    setFormError(null);
    try {
      if (selectedOffering) {
        // Edit mode: only update teacher and active state
        await apiPut(`/offerings/${selectedOffering._id}`, {
          teacher: teacherId || null,
          isActive,
        });
        showToast('Offering updated successfully', 'success');
      } else {
        // Create mode
        if (!courseId) throw new Error('Course is required');
        if (!semesterId) throw new Error('Semester is required');
        if (!batchId) throw new Error('Batch is required');
        if (!section) throw new Error('Section is required');

        await apiPost('/offerings', {
          course: courseId,
          semester: semesterId,
          batch: batchId,
          section,
          teacher: teacherId || null,
        });
        showToast('Offering created successfully', 'success');
      }
      setIsFormOpen(false);
      fetchOfferings();
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
      if (bulkRows.length === 0) throw new Error('At least one offering row is required');

      for (const row of bulkRows) {
        if (!row.course) throw new Error('Course is required for all rows');
        if (!row.section) throw new Error('Section is required for all rows');
      }

      await apiPost('/offerings/bulk', {
        semester: bulkSemesterId,
        batch: bulkBatchId,
        offerings: bulkRows.map(r => ({
          course: r.course,
          section: r.section,
          teacher: r.teacher || null,
        })),
      });

      showToast('Bulk offerings created successfully', 'success');
      setIsBulkOpen(false);
      fetchOfferings();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'An error occurred');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedOffering) return;
    setSubmitLoading(true);
    try {
      await apiDelete(`/offerings/${selectedOffering._id}`);
      showToast('Offering deleted successfully', 'success');
      setIsDeleteOpen(false);
      fetchOfferings();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete offering', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const columns: ColumnConfig<ICourseOffering>[] = [
    { key: 'courseCode', label: 'Course Code' },
    { key: 'courseTitle', label: 'Title' },
    { key: 'semesterName', label: 'Semester' },
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
    },
    {
      key: 'teacher',
      label: 'Teacher',
      render: (item) => item.teacherInitial ? `${item.teacherName || ''} (${item.teacherInitial})` : '-'
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (item) => (
        <span className={`px-1.5 py-0.5 border text-[10px] font-mono ${
          item.isActive 
            ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-bold' 
            : 'border-zinc-300 dark:border-zinc-800 text-zinc-400'
        }`}>
          {item.isActive ? 'ACTIVE' : 'INACTIVE'}
        </span>
      )
    }
  ];

  return (
    <DashboardLayout title="Course Offerings">
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search offerings by course code..."
        onEdit={openEditModal}
        onDelete={openDeleteConfirm}
        topActions={
          <div className="flex gap-2">
            <button
              onClick={openBulkModal}
              className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono text-xs font-semibold hover:border-zinc-900 dark:hover:border-zinc-100 cursor-pointer"
            >
              BULK CREATE
            </button>
            <button
              onClick={openCreateModal}
              className="px-3 py-2 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
            >
              NEW OFFERING
            </button>
          </div>
        }
      />

      {/* Single Form Modal */}
      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedOffering ? "Edit Offering" : "New Course Offering"}
        onSubmit={handleSubmit}
        loading={submitLoading}
      >
        {formError && (
          <div className="p-3 border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-mono">
            {formError.toUpperCase()}
          </div>
        )}

        {selectedOffering ? (
          // View-only info of unmodifiable core fields
          <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 font-mono text-[10px] space-y-1 text-zinc-500 uppercase">
            <div>COURSE: {selectedOffering.courseCode} - {selectedOffering.courseTitle}</div>
            <div>SEMESTER: {selectedOffering.semesterName}</div>
            <div>SECTION: {selectedOffering.batch && typeof selectedOffering.batch === 'object' ? `${selectedOffering.batch.code}_${selectedOffering.section}` : selectedOffering.section}</div>
          </div>
        ) : (
          <>
            <FormField label="Course">
              <select
                value={courseId}
                required
                onChange={(e) => setCourseId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
              >
                <option value="">SELECT COURSE</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.code} - {c.title}
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
                      {s.name} ({s.status.toUpperCase()})
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
                    setSection(''); // Reset section on batch change
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

            <FormField label="Section" hint="Defined sections of the selected batch">
              <select
                value={section}
                required
                disabled={!batchId}
                onChange={(e) => setSection(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none disabled:opacity-50"
              >
                <option value="">SELECT SECTION</option>
                {availableSections.map((sec) => {
                  const selectedBatchCode = selectedBatchObj?.code || '';
                  const label = selectedBatchCode ? `${selectedBatchCode}_${sec}` : sec;
                  return (
                    <option key={sec} value={sec}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </FormField>
          </>
        )}

        <FormField label="Assigned Teacher (Faculty)">
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
          >
            <option value="">UNASSIGNED / NO TEACHER</option>
            {teachers.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name} ({t.teacherInitial || t.email})
              </option>
            ))}
          </select>
        </FormField>

        {selectedOffering && (
          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-3.5 w-3.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none cursor-pointer"
            />
            <label htmlFor="isActive" className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
              OFFERING IS ACTIVE & ENROLLABLE
            </label>
          </div>
        )}
      </FormModal>

      {/* Bulk Form Modal */}
      <FormModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        title="Bulk Create Offerings"
        onSubmit={handleBulkSubmit}
        loading={submitLoading}
        size="xl"
      >
        {formError && (
          <div className="p-3 border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-mono">
            {formError.toUpperCase()}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                // Clear row sections to prevent inconsistencies
                setBulkRows(bulkRows.map(r => ({ ...r, section: '' })));
              }}
              className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
            >
              <option value="">SELECT BATCH</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Offerings Row Editor */}
        <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-mono font-bold tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">
              Offerings List
            </h4>
            <button
              type="button"
              onClick={handleAddBulkRow}
              className="px-2 py-1 border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono uppercase hover:border-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:text-zinc-300 cursor-pointer"
            >
              + Add Course Row
            </button>
          </div>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {bulkRows.map((row, index) => (
              <div key={index} className="flex gap-3 items-end border border-dashed border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50/50 dark:bg-zinc-900/30">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[9px] font-mono text-zinc-400">COURSE</label>
                  <select
                    required
                    value={row.course}
                    onChange={(e) => handleBulkRowChange(index, 'course', e.target.value)}
                    className="mt-1 block w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
                  >
                    <option value="">SELECT COURSE</option>
                    {courses.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.code} - {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-40">
                  <label className="block text-[9px] font-mono text-zinc-400">SECTION</label>
                  <select
                    required
                    disabled={!bulkBatchId}
                    value={row.section}
                    onChange={(e) => handleBulkRowChange(index, 'section', e.target.value)}
                    className="mt-1 block w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none disabled:opacity-50"
                  >
                    <option value="">SELECT</option>
                    {availableSections.map((sec) => {
                      const batchCode = selectedBatchObj?.code || '';
                      const label = batchCode ? `${batchCode}_${sec}` : sec;
                      return (
                        <option key={sec} value={sec}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-[9px] font-mono text-zinc-400">TEACHER</label>
                  <select
                    value={row.teacher}
                    onChange={(e) => handleBulkRowChange(index, 'teacher', e.target.value)}
                    className="mt-1 block w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
                  >
                    <option value="">UNASSIGNED</option>
                    {teachers.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} ({t.teacherInitial})
                      </option>
                    ))}
                  </select>
                </div>

                {bulkRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveBulkRow(index)}
                    className="px-2 py-1 border border-red-200 dark:border-red-950 text-[10px] font-mono text-red-600 dark:text-red-400 hover:border-red-500 cursor-pointer"
                  >
                    [X]
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </FormModal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Course Offering"
        message={`Are you sure you want to delete this course offering for "${selectedOffering?.courseCode || ''}" (Section ${selectedOffering?.batch && typeof selectedOffering.batch === 'object' ? `${selectedOffering.batch.code}_${selectedOffering.section}` : (selectedOffering?.section || '')})?`}
        loading={submitLoading}
      />
    </DashboardLayout>
  );
}
