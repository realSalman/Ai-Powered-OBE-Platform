"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { DataTable, ColumnConfig } from '@/components/ui/DataTable';
import { FormModal } from '@/components/ui/FormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { IBatch, IDepartment, IProgram, PaginationMeta } from '@/types/api';

export default function BatchesPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [data, setData] = useState<IBatch[]>([]);
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [programs, setPrograms] = useState<IProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<IBatch | null>(null);

  // Form fields
  const [code, setCode] = useState('');
  const [sectionsStr, setSectionsStr] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [programId, setProgramId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const isSuperAdmin = user?.roles?.map(r => r.toLowerCase()).includes('superadmin');
  const userDeptId = user?.department || '';

  const selectedDept = departments.find(d => d._id === departmentId);
  const showDeptSelector = isSuperAdmin;
  const showProgramSelector = !!selectedDept?.hasPrograms;

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const response = await apiGet<IBatch[]>('/batches', {
        page,
        limit: 10,
        search: search || undefined,
      });
      setData(response.data);
      setMeta(response.meta);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to fetch batches', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [deptsRes, progsRes] = await Promise.all([
        apiGet<IDepartment[]>('/departments', { limit: 100 }),
        apiGet<IProgram[]>('/programs', { limit: 100 }),
      ]);
      setDepartments(deptsRes.data);
      setPrograms(progsRes.data);
    } catch (err) {
      console.error('Failed to fetch dependencies', err);
    }
  };

  useEffect(() => {
    fetchBatches();
    fetchDependencies();
  }, [page, search]);

  const openCreateModal = () => {
    setSelectedBatch(null);
    setCode('');
    setSectionsStr('A, B');
    setDepartmentId(isSuperAdmin ? (departments[0]?._id || '') : userDeptId);
    setProgramId('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (batch: IBatch) => {
    setSelectedBatch(batch);
    setCode(batch.code);
    setSectionsStr(batch.sections ? batch.sections.join(', ') : '');
    
    const deptId = batch.department && typeof batch.department === 'object' ? batch.department._id : (batch.department || '');
    setDepartmentId(deptId || '');
    
    const progId = batch.program
      ? (typeof batch.program === 'object' ? batch.program?._id : batch.program)
      : '';
    setProgramId(progId || '');

    setFormError(null);
    setIsFormOpen(true);
  };

  const openDeleteConfirm = (batch: IBatch) => {
    setSelectedBatch(batch);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitLoading(true);
    setFormError(null);
    try {
      if (!code.trim()) throw new Error('Batch code is required');
      if (!departmentId) throw new Error('Department is required');

      const selectedDept = departments.find(d => d._id === departmentId);
      if (selectedDept?.hasPrograms && !programId) {
        throw new Error('Program is required for this department');
      }

      // Parse sections
      const sections = sectionsStr
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s.length > 0);

      const payload = {
        code: code.trim(),
        sections,
        department: departmentId,
        program: programId || null,
      };

      if (selectedBatch) {
        await apiPut(`/batches/${selectedBatch._id}`, payload);
        showToast('Batch updated successfully', 'success');
      } else {
        await apiPost('/batches', payload);
        showToast('Batch created successfully', 'success');
      }

      setIsFormOpen(false);
      fetchBatches();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'An error occurred');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBatch) return;
    setSubmitLoading(true);
    try {
      await apiDelete(`/batches/${selectedBatch._id}`);
      showToast('Batch deleted successfully', 'success');
      setIsDeleteOpen(false);
      fetchBatches();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete batch', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const columns: ColumnConfig<IBatch>[] = [
    { key: 'code', label: 'Batch Code' },
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
      key: 'program',
      label: 'Program',
      render: (item) => {
        if (item.program && typeof item.program === 'object') return item.program.code;
        const prog = programs.find(p => p._id === item.program);
        return prog ? prog.code : '-';
      }
    },
    {
      key: 'sections',
      label: 'Sections',
      render: (item) => item.sections?.join(', ') || '-'
    }
  ];

  return (
    <DashboardLayout title="Batches">
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search batches..."
        onEdit={openEditModal}
        onDelete={openDeleteConfirm}
        topActions={
          <button
            onClick={openCreateModal}
            className="px-3 py-2 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
          >
            NEW BATCH
          </button>
        }
      />

      {/* Create/Edit Modal */}
      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedBatch ? "Edit Batch" : "New Batch"}
        onSubmit={handleSubmit}
        loading={submitLoading}
      >
        {formError && (
          <div className="p-3 border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-mono">
            {formError.toUpperCase()}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Batch Code" hint="e.g. 45, 46, CSE-45">
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
            />
          </FormField>

          <FormField label="Sections" hint="Comma-separated, e.g. A, B, C">
            <input
              type="text"
              required
              value={sectionsStr}
              onChange={(e) => setSectionsStr(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors uppercase"
            />
          </FormField>
        </div>

        {showDeptSelector || showProgramSelector ? (
          <div className={`grid grid-cols-1 ${showDeptSelector && showProgramSelector ? 'md:grid-cols-2' : ''} gap-6 mt-6`}>
            {showDeptSelector && (
              <FormField label="Department">
                <select
                  value={departmentId}
                  required
                  onChange={(e) => {
                    setDepartmentId(e.target.value);
                    setProgramId('');
                  }}
                  className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                >
                  <option value="">SELECT DEPARTMENT</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            {showProgramSelector && (
              <FormField label="Program">
                <select
                  value={programId}
                  disabled={!departmentId}
                  onChange={(e) => setProgramId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors disabled:opacity-50"
                >
                  <option value="">SELECT PROGRAM</option>
                  {programs
                    .filter((p) => {
                      const pDeptId = typeof p.department === 'object' ? p.department._id : p.department;
                      return pDeptId === departmentId;
                    })
                    .map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                </select>
              </FormField>
            )}
          </div>
        ) : null}
      </FormModal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Batch"
        message={`Are you sure you want to delete batch "${selectedBatch?.code || ''}"?`}
        loading={submitLoading}
      />
    </DashboardLayout>
  );
}

