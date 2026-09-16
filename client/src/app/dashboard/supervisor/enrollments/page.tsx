"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import RoleGuard from '@/components/RoleGuard';
import { DataTable, ColumnConfig } from '@/components/ui/DataTable';
import { FormModal } from '@/components/ui/FormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { IEnrollment, ICourseOffering, IBatch, IUser, PaginationMeta } from '@/types/api';

export default function SupervisorEnrollmentsPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<IEnrollment[]>([]);
  const [offerings, setOfferings] = useState<ICourseOffering[]>([]);
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
  const [selectedEnrollment, setSelectedEnrollment] = useState<IEnrollment | null>(null);

  // Single Form fields
  const [studentId, setStudentId] = useState('');
  const [offeringId, setOfferingId] = useState('');
  const [isElective, setIsElective] = useState(false);
  const [status, setStatus] = useState<'active' | 'dropped'>('active');
  const [formError, setFormError] = useState<string | null>(null);

  // Bulk Form fields
  const [bulkOfferingId, setBulkOfferingId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const response = await apiGet<IEnrollment[]>('/enrollments', {
        page,
        limit: 10,
        search: search || undefined,
      });
      setData(response.data);
      setMeta(response.meta);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to fetch enrollments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [offeringsRes, batchesRes, studentsRes] = await Promise.all([
        apiGet<ICourseOffering[]>('/offerings', { limit: 100 }),
        apiGet<IBatch[]>('/batches', { limit: 100 }),
        apiGet<IUser[]>('/admin/users', { role: 'student' }),
      ]);
      setOfferings(offeringsRes.data);
      setBatches(batchesRes.data);
      setStudents(studentsRes.data);
    } catch (err) {
      console.error('Failed to fetch dependencies', err);
    }
  };

  useEffect(() => {
    fetchEnrollments();
    fetchDependencies();
  }, [page, search]);

  const openCreateModal = () => {
    setSelectedEnrollment(null);
    setStudentId('');
    setOfferingId(offerings[0]?._id || '');
    setIsElective(false);
    setStatus('active');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (enrollment: IEnrollment) => {
    setSelectedEnrollment(enrollment);
    
    setStudentId(enrollment.student && typeof enrollment.student === 'object' ? enrollment.student._id : (enrollment.student || ''));
    setOfferingId(enrollment.courseOffering && typeof enrollment.courseOffering === 'object' ? enrollment.courseOffering._id : (enrollment.courseOffering || ''));
    
    setIsElective(enrollment.isElective);
    setStatus(enrollment.status);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openBulkModal = () => {
    setBulkOfferingId(offerings[0]?._id || '');
    setSelectedStudentIds([]);
    setFormError(null);
    setIsBulkOpen(true);
  };

  const openDeleteConfirm = (enroll: IEnrollment) => {
    setSelectedEnrollment(enroll);
    setIsDeleteOpen(true);
  };

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
      if (selectedEnrollment) {
        await apiPut(`/enrollments/${selectedEnrollment._id}`, {
          status,
        });
        showToast('Enrollment updated successfully', 'success');
      } else {
        if (!studentId) throw new Error('Student is required');
        if (!offeringId) throw new Error('Course Offering is required');

        await apiPost('/enrollments', {
          student: studentId,
          courseOffering: offeringId,
          isElective,
        });
        showToast('Student enrolled successfully', 'success');
      }
      setIsFormOpen(false);
      fetchEnrollments();
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
      if (!bulkOfferingId) throw new Error('Course Offering is required');
      if (selectedStudentIds.length === 0) throw new Error('At least one student must be selected');

      await apiPost('/enrollments/bulk', {
        courseOffering: bulkOfferingId,
        students: selectedStudentIds,
      });

      showToast('Bulk enrollment completed successfully', 'success');
      setIsBulkOpen(false);
      fetchEnrollments();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'An error occurred');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEnrollment) return;
    setSubmitLoading(true);
    try {
      await apiDelete(`/enrollments/${selectedEnrollment._id}`);
      showToast('Enrollment deleted successfully', 'success');
      setIsDeleteOpen(false);
      fetchEnrollments();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete enrollment', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const selectedBulkOfferingObj = offerings.find(o => o._id === bulkOfferingId);
  const targetBatchObj = (selectedBulkOfferingObj && selectedBulkOfferingObj.batch)
    ? batches.find(b => b._id === (typeof selectedBulkOfferingObj.batch === 'object' && selectedBulkOfferingObj.batch !== null ? selectedBulkOfferingObj.batch._id : selectedBulkOfferingObj.batch)) 
    : null;

  const filteredStudents = students.filter(s => {
    if (!targetBatchObj) return false;
    return s.batch === targetBatchObj.code;
  });

  const columns: ColumnConfig<IEnrollment>[] = [
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
      key: 'courseOffering',
      label: 'Course Offering',
      render: (item) => {
        if (item.courseOffering && typeof item.courseOffering === 'object') {
          const batchCode = item.courseOffering.batch && typeof item.courseOffering.batch === 'object' ? item.courseOffering.batch.code : '';
          const secFormatted = batchCode ? `${batchCode}_${item.courseOffering.section}` : item.courseOffering.section;
          return `${item.courseOffering.courseCode} - SEC ${secFormatted}`;
        }
        return item.courseOffering || '-';
      }
    },
    {
      key: 'semester',
      label: 'Semester',
      render: (item) => {
        if (item.courseOffering && typeof item.courseOffering === 'object') {
          return item.courseOffering.semesterName;
        }
        return '-';
      }
    },
    {
      key: 'isElective',
      label: 'Type',
      render: (item) => (
        <span className={`px-1.5 py-0.5 border text-[10px] font-mono ${
          item.isElective 
            ? 'border-dashed border-zinc-400 text-zinc-600 dark:text-zinc-400' 
            : 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
        }`}>
          {item.isElective ? 'ELECTIVE' : 'CORE'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => (
        <span className={`px-1.5 py-0.5 border text-[10px] font-mono uppercase ${
          item.status === 'active' 
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-bold' 
            : 'border-red-300 dark:border-red-950 text-red-500 font-bold'
        }`}>
          {item.status}
        </span>
      )
    }
  ];

  return (
    <RoleGuard allowedRoles={["supervisor"]}>
      <DashboardLayout title="Supervisor: Enrollments">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          meta={meta}
          onPageChange={setPage}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search enrollments..."
          onEdit={openEditModal}
          onDelete={openDeleteConfirm}
          topActions={
            <div className="flex gap-2">
              <button
                onClick={openBulkModal}
                className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono text-xs font-semibold hover:border-zinc-900 dark:hover:border-zinc-100 cursor-pointer"
              >
                BULK ENROLL
              </button>
              <button
                onClick={openCreateModal}
                className="px-3 py-2 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
              >
                NEW ENROLLMENT
              </button>
            </div>
          }
        />

        {/* Single Enroll Modal */}
        <FormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={selectedEnrollment ? "Edit Enrollment" : "New Student Enrollment"}
          onSubmit={handleSubmit}
          loading={submitLoading}
        >
          {formError && (
            <div className="p-3 border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-mono">
              {formError.toUpperCase()}
            </div>
          )}

          {selectedEnrollment ? (
            <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 font-mono text-[10px] space-y-1 text-zinc-500 uppercase">
              <div>STUDENT: {selectedEnrollment.student?.name || ''} ({selectedEnrollment.student?.studentId || ''})</div>
              <div>OFFERING: {selectedEnrollment.courseOffering && typeof selectedEnrollment.courseOffering === 'object' ? `${selectedEnrollment.courseOffering.courseCode} SEC ${selectedEnrollment.courseOffering.batch && typeof selectedEnrollment.courseOffering.batch === 'object' ? `${selectedEnrollment.courseOffering.batch.code}_${selectedEnrollment.courseOffering.section}` : selectedEnrollment.courseOffering.section}` : (selectedEnrollment.courseOffering || '')}</div>
            </div>
          ) : (
            <>
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

              <FormField label="Course Offering">
                <select
                  value={offeringId}
                  required
                  onChange={(e) => setOfferingId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
                >
                  <option value="">SELECT OFFERING</option>
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

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isElective"
                  checked={isElective}
                  onChange={(e) => setIsElective(e.target.checked)}
                  className="h-3.5 w-3.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none cursor-pointer"
                />
                <label htmlFor="isElective" className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  THIS COURSE IS AN ELECTIVE FOR THE STUDENT
                </label>
              </div>
            </>
          )}

          {selectedEnrollment && (
            <FormField label="Enrollment Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
              >
                <option value="active">ACTIVE</option>
                <option value="dropped">DROPPED / WITHDRAWN</option>
              </select>
            </FormField>
          )}
        </FormModal>

        {/* Bulk Enroll Modal */}
        <FormModal
          isOpen={isBulkOpen}
          onClose={() => setIsBulkOpen(false)}
          title="Bulk Enroll Students"
          onSubmit={handleBulkSubmit}
          loading={submitLoading}
          size="lg"
        >
          {formError && (
            <div className="p-3 border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-mono">
              {formError.toUpperCase()}
            </div>
          )}

          <FormField label="Course Offering" hint="Select offering. Checkboxes will load students from offering's batch.">
            <select
              value={bulkOfferingId}
              required
              onChange={(e) => {
                setBulkOfferingId(e.target.value);
                setSelectedStudentIds([]);
              }}
              className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
            >
              <option value="">SELECT OFFERING</option>
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

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
            <h4 className="text-xs font-mono font-bold tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">
              Select Students to Enroll ({targetBatchObj ? `Batch: ${targetBatchObj.code}` : 'No Offering Selected'})
            </h4>

            {!bulkOfferingId ? (
              <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase italic">
                Please select a course offering to display batch students.
              </p>
            ) : filteredStudents.length === 0 ? (
              <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase italic">
                No students found in batch "{targetBatchObj?.code || ''}".
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
          title="Unenroll Student"
          message={`Are you sure you want to completely remove this student enrollment? This will delete all course history for this enrollment.`}
          loading={submitLoading}
        />
      </DashboardLayout>
    </RoleGuard>
  );
}
