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
import { IProgram, IDepartment, IProgramOutcome, PaginationMeta } from '@/types/api';

export default function HODProgramsPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<IProgram[]>([]);
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<IProgram | null>(null);

  // Form fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [programOutcomes, setProgramOutcomes] = useState<IProgramOutcome[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const response = await apiGet<IProgram[]>('/programs', {
        page,
        limit: 10,
        search: search || undefined,
      });
      setData(response.data);
      setMeta(response.meta);
    } catch (err: any) {
      const errData = err.response?.data?.error;
      showToast(errData?.message || err.response?.data?.message || 'Failed to fetch programs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await apiGet<IDepartment[]>('/departments', { limit: 100 });
      setDepartments(response.data);
    } catch (err: any) {
      console.error('Failed to fetch departments list', err);
    }
  };

  useEffect(() => {
    fetchPrograms();
    fetchDepartments();
  }, [page, search]);

  const openCreateModal = () => {
    setSelectedProgram(null);
    setCode('');
    setName('');
    const programDepts = departments.filter(d => d.hasPrograms);
    setDepartmentId(programDepts[0]?._id || '');
    setProgramOutcomes([]);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (prog: IProgram) => {
    setSelectedProgram(prog);
    setCode(prog.code);
    setName(prog.name);
    setDepartmentId(prog.department && typeof prog.department === 'object' ? prog.department._id : (prog.department || ''));
    setProgramOutcomes(prog.programOutcomes || []);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openDeleteConfirm = (prog: IProgram) => {
    setSelectedProgram(prog);
    setIsDeleteOpen(true);
  };

  const handleAddOutcome = () => {
    setProgramOutcomes([...programOutcomes, { code: `PO${programOutcomes.length + 1}`, description: '' }]);
  };

  const handleRemoveOutcome = (index: number) => {
    setProgramOutcomes(programOutcomes.filter((_, i) => i !== index));
  };

  const handleOutcomeChange = (index: number, field: keyof IProgramOutcome, val: string) => {
    const updated = [...programOutcomes];
    updated[index] = { ...updated[index], [field]: val };
    setProgramOutcomes(updated);
  };

  const handleSubmit = async () => {
    setSubmitLoading(true);
    setFormError(null);
    try {
      if (!code.trim()) throw new Error('Code is required');
      if (!name.trim()) throw new Error('Name is required');
      if (!departmentId) throw new Error('Department is required');
      
      for (const po of programOutcomes) {
        if (!/^(PO|PSO)\d+$/.test(po.code)) {
          throw new Error(`Invalid PO/PSO Code "${po.code}". Format must be PO1, PO2, PSO1, etc.`);
        }
        if (po.description.length < 5) {
          throw new Error(`PO/PSO ${po.code} description must be at least 5 characters.`);
        }
      }

      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        department: departmentId,
        programOutcomes,
      };

      if (selectedProgram) {
        await apiPut(`/programs/${selectedProgram._id}`, payload);
        showToast('Program updated successfully', 'success');
      } else {
        await apiPost('/programs', payload);
        showToast('Program created successfully', 'success');
      }

      setIsFormOpen(false);
      fetchPrograms();
    } catch (err: any) {
      const errData = err.response?.data?.error;
      let msg = errData?.message || err.response?.data?.message || err.message || 'An error occurred';
      setFormError(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProgram) return;
    setSubmitLoading(true);
    try {
      await apiDelete(`/programs/${selectedProgram._id}`);
      showToast('Program deleted successfully', 'success');
      setIsDeleteOpen(false);
      fetchPrograms();
    } catch (err: any) {
      const errData = err.response?.data?.error;
      showToast(errData?.message || err.response?.data?.message || 'Failed to delete program', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const columns: ColumnConfig<IProgram>[] = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
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
      key: 'programOutcomes',
      label: 'PO Count',
      render: (item) => item.programOutcomes?.length || 0
    }
  ];

  return (
    <RoleGuard allowedRoles={["HOD", "hod"]}>
      <DashboardLayout title="HOD: Programs">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          meta={meta}
          onPageChange={setPage}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search programs..."
          onEdit={openEditModal}
          onDelete={openDeleteConfirm}
          topActions={
            <button
              onClick={openCreateModal}
              className="px-3 py-2 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
            >
              NEW PROGRAM
            </button>
          }
        />

        {/* Create/Edit Modal */}
        <FormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={selectedProgram ? "Edit Program" : "New Program"}
          onSubmit={handleSubmit}
          loading={submitLoading}
          size="lg"
        >
          {formError && (
            <div className="p-3 border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-mono">
              {formError.toUpperCase()}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Program Code" hint="e.g. BSCSE, BSSE (2-15 chars)">
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors uppercase"
              />
            </FormField>

            <FormField label="Program Name" hint="e.g. Bachelor of Science in CSE">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
              />
            </FormField>
          </div>

          <FormField label="Associated Department">
            <select
              value={departmentId}
              required
              onChange={(e) => setDepartmentId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
            >
              <option value="">SELECT DEPARTMENT</option>
              {departments.filter(dept => dept.hasPrograms).map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </FormField>

          {/* Program Outcomes Array Editor */}
          <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-mono font-bold tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">
                Program Outcomes (PO / PSO)
              </h4>
              <button
                type="button"
                onClick={handleAddOutcome}
                className="px-2 py-1 border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono uppercase hover:border-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:text-zinc-300 cursor-pointer"
              >
                + Add PO/PSO
              </button>
            </div>

            {programOutcomes.length === 0 ? (
              <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase italic">
                No program outcomes defined yet.
              </p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {programOutcomes.map((po, index) => (
                  <div key={index} className="flex gap-3 items-start border border-dashed border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50/50 dark:bg-zinc-900/30">
                    <div className="w-1/4">
                      <label className="block text-[9px] font-mono text-zinc-400">CODE</label>
                      <input
                        type="text"
                        required
                        value={po.code}
                        placeholder="e.g. PO1, PSO1"
                        onChange={(e) => handleOutcomeChange(index, 'code', e.target.value)}
                        className="mt-1 block w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none uppercase"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[9px] font-mono text-zinc-400">DESCRIPTION</label>
                      <textarea
                        required
                        rows={1}
                        value={po.description}
                        placeholder="Enter outcome description..."
                        onChange={(e) => handleOutcomeChange(index, 'description', e.target.value)}
                        className="mt-1 block w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none resize-y"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveOutcome(index)}
                      className="mt-4 px-2 py-1 border border-red-200 dark:border-red-950 text-[10px] font-mono text-red-600 dark:text-red-400 hover:border-red-500 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FormModal>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={handleDelete}
          title="Delete Program"
          message={`Are you sure you want to delete program "${selectedProgram?.name || ''}" (${selectedProgram?.code || ''})? This will also affect any associated courses and batches.`}
          loading={submitLoading}
        />
      </DashboardLayout>
    </RoleGuard>
  );
}
