"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { DataTable, ColumnConfig } from '@/components/ui/DataTable';
import { FormModal } from '@/components/ui/FormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { ISemester, IDepartment, PaginationMeta, SemesterStatus } from '@/types/api';

export default function SemestersPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<ISemester[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState<ISemester | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<SemesterStatus>('upcoming');
  const [formError, setFormError] = useState<string | null>(null);

  // Dependencies
  const [departments, setDepartments] = useState<IDepartment[]>([]);

  const fetchSemesters = async () => {
    setLoading(true);
    try {
      const response = await apiGet<ISemester[]>('/semesters', {
        page,
        limit: 10,
        search: search || undefined,
      });
      setData(response.data);
      setMeta(response.meta);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to fetch semesters', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const res = await apiGet<IDepartment[]>('/departments', { limit: 100 });
      setDepartments(res.data);
    } catch (err) {
      console.error('Failed to fetch departments', err);
    }
  };

  useEffect(() => {
    fetchSemesters();
    fetchDependencies();
  }, [page, search]);

  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const openCreateModal = () => {
    setSelectedSemester(null);
    setName('');
    setDepartmentId(departments[0]?._id || '');
    setStartDate('');
    setEndDate('');
    setStatus('upcoming');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (sem: ISemester) => {
    setSelectedSemester(sem);
    setName(sem.name);
    setStartDate(formatDateForInput(sem.startDate));
    setEndDate(formatDateForInput(sem.endDate));
    setStatus(sem.status);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openDeleteConfirm = (sem: ISemester) => {
    setSelectedSemester(sem);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitLoading(true);
    setFormError(null);
    try {
      if (!name.trim()) throw new Error('Name is required');
      if (name.trim().length < 3) throw new Error('Name must be at least 3 characters');
      if (name.trim().length > 50) throw new Error('Name must be at most 50 characters');
      if (!startDate) throw new Error('Start date is required');
      if (!endDate) throw new Error('End date is required');

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) {
        throw new Error('Start date must be before end date');
      }

      const payload: any = {
        name: name.trim(),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        status,
      };

      if (selectedSemester) {
        await apiPut(`/semesters/${selectedSemester._id}`, payload);
        showToast('Semester updated successfully', 'success');
      } else {
        if (!departmentId) throw new Error('Department is required');
        payload.department = departmentId;
        await apiPost('/semesters', payload);
        showToast('Semester created successfully', 'success');
      }

      setIsFormOpen(false);
      fetchSemesters();
    } catch (err: any) {
      const errData = err.response?.data?.error;
      const msg = errData?.message || err.response?.data?.message || err.message || 'An error occurred';
      const details = errData?.details ? JSON.stringify(errData.details) : '';
      setFormError(details ? `${msg}: ${details}` : msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSemester) return;
    setSubmitLoading(true);
    try {
      await apiDelete(`/semesters/${selectedSemester._id}`);
      showToast('Semester deleted successfully', 'success');
      setIsDeleteOpen(false);
      fetchSemesters();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete semester', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const columns: ColumnConfig<ISemester>[] = [
    { key: 'name', label: 'Semester Name' },
    {
      key: 'department',
      label: 'Department',
      render: (item) => {
        if (typeof item.department === 'object' && item.department !== null) return item.department.code;
        const dept = departments.find(d => d._id === item.department);
        return dept ? dept.code : '-';
      }
    },
    {
      key: 'startDate',
      label: 'Start Date',
      render: (item) => formatDate(item.startDate)
    },
    {
      key: 'endDate',
      label: 'End Date',
      render: (item) => formatDate(item.endDate)
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => {
        let badgeStyle = 'border-zinc-300 dark:border-zinc-700 text-zinc-500';
        if (item.status === 'active') {
          badgeStyle = 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-bold';
        } else if (item.status === 'upcoming') {
          badgeStyle = 'border-dashed border-zinc-400 text-zinc-700 dark:text-zinc-300';
        }
        return (
          <span className={`px-1.5 py-0.5 border text-[10px] font-mono uppercase ${badgeStyle}`}>
            {item.status}
          </span>
        );
      }
    }
  ];

  return (
    <DashboardLayout title="Semesters">
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search semesters..."
        onEdit={openEditModal}
        onDelete={openDeleteConfirm}
        topActions={
          <button
            onClick={openCreateModal}
            className="px-3 py-2 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
          >
            NEW SEMESTER
          </button>
        }
      />

      {/* Create/Edit Modal */}
      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedSemester ? "Edit Semester" : "New Semester"}
        onSubmit={handleSubmit}
        loading={submitLoading}
      >
        {formError && (
          <div className="p-3 border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-mono">
            {formError.toUpperCase()}
          </div>
        )}

        <FormField label="Semester Name" hint="e.g. Autumn 2026, Spring 2026">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
          />
        </FormField>

        {!selectedSemester && (
          <FormField label="Department">
            <select
              required
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
            >
              <option value="">SELECT DEPARTMENT</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Start Date">
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
            />
          </FormField>

          <FormField label="End Date">
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
            />
          </FormField>
        </div>

        <FormField label="Semester Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SemesterStatus)}
            className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
          >
            <option value="upcoming">UPCOMING</option>
            <option value="active">ACTIVE</option>
            <option value="completed">COMPLETED</option>
          </select>
        </FormField>
      </FormModal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Semester"
        message={`Are you sure you want to delete semester "${selectedSemester?.name || ''}"? This will affect offerings and assignments linked to this semester.`}
        loading={submitLoading}
      />
    </DashboardLayout>
  );
}
