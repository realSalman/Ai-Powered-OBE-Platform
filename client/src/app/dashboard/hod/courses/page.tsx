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
import { ICourse, IDepartment, IProgram, ICourseOutcome, ICoPoMapping, PaginationMeta } from '@/types/api';

export default function HODCoursesPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<ICourse[]>([]);
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [programs, setPrograms] = useState<IProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<ICourse | null>(null);

  // Matrix View State
  const [matrixData, setMatrixData] = useState<any>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);

  // Form fields
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [credits, setCredits] = useState(3);
  const [type, setType] = useState<'theory' | 'lab' | 'project'>('theory');
  const [departmentId, setDepartmentId] = useState('');
  const [programId, setProgramId] = useState('');
  const [courseOutcomes, setCourseOutcomes] = useState<ICourseOutcome[]>([]);
  const [coPoMapping, setCoPoMapping] = useState<ICoPoMapping[]>([]);

  const [formError, setFormError] = useState<string | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await apiGet<ICourse[]>('/courses', {
        page,
        limit: 10,
        search: search || undefined,
      });
      setData(response.data);
      setMeta(response.meta);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to fetch courses', 'error');
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
    fetchCourses();
    fetchDependencies();
  }, [page, search]);

  const openCreateModal = () => {
    setSelectedCourse(null);
    setCode('');
    setTitle('');
    setCredits(3);
    setType('theory');
    setDepartmentId(departments[0]?._id || '');
    setProgramId('');
    setCourseOutcomes([{ code: 'CO1', description: '', bloomLevel: 'Remember' }]);
    setCoPoMapping([]);

    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (course: ICourse) => {
    setSelectedCourse(course);
    setCode(course.code);
    setTitle(course.title);
    setCredits(course.credits);
    setType(course.type);
    
    const deptId = course.department && typeof course.department === 'object' ? course.department._id : (course.department || '');
    setDepartmentId(deptId);
    
    const progId = course.program
      ? (typeof course.program === 'object' ? course.program._id : course.program)
      : '';
    setProgramId(progId);
    
    setCourseOutcomes(course.courseOutcomes || []);
    setCoPoMapping(course.coPoMapping || []);

    setFormError(null);
    setIsFormOpen(true);
  };

  const openDeleteConfirm = (course: ICourse) => {
    setSelectedCourse(course);
    setIsDeleteOpen(true);
  };

  const openMatrixView = async (course: ICourse) => {
    setSelectedCourse(course);
    setIsMatrixOpen(true);
    setMatrixLoading(true);
    try {
      const response = await apiGet<any>(`/courses/${course._id}/matrix`);
      setMatrixData(response.data);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to fetch CO-PO matrix', 'error');
      setIsMatrixOpen(false);
    } finally {
      setMatrixLoading(false);
    }
  };

  const getAvailablePOs = () => {
    if (programId) {
      const prog = programs.find(p => p._id === programId);
      if (prog && prog.programOutcomes) return prog.programOutcomes;
    }
    if (departmentId) {
      const dept = departments.find(d => d._id === departmentId);
      if (dept && dept.programOutcomes) return dept.programOutcomes;
    }
    return [];
  };

  const availablePOs = getAvailablePOs();

  const handleAddCO = () => {
    setCourseOutcomes([...courseOutcomes, { code: `CO${courseOutcomes.length + 1}`, description: '', bloomLevel: 'Remember' }]);
  };

  const handleRemoveCO = (index: number) => {
    const coToRemove = courseOutcomes[index].code;
    setCourseOutcomes(courseOutcomes.filter((_, i) => i !== index));
    setCoPoMapping(coPoMapping.filter(m => m.co !== coToRemove));
  };

  const handleCOChange = (index: number, field: keyof ICourseOutcome, val: string) => {
    const updated = [...courseOutcomes];
    updated[index] = { ...updated[index], [field]: val } as ICourseOutcome;
    setCourseOutcomes(updated);
  };

  const handleAddMapping = () => {
    if (courseOutcomes.length === 0 || availablePOs.length === 0) {
      showToast('Define Course Outcomes and POs first', 'error');
      return;
    }
    setCoPoMapping([...coPoMapping, { co: courseOutcomes[0].code, po: availablePOs[0].code, weight: 1 }]);
  };

  const handleRemoveMapping = (index: number) => {
    setCoPoMapping(coPoMapping.filter((_, i) => i !== index));
  };

  const handleMappingChange = (index: number, field: keyof ICoPoMapping, val: any) => {
    const updated = [...coPoMapping];
    updated[index] = { ...updated[index], [field]: val } as ICoPoMapping;
    setCoPoMapping(updated);
  };



  const handleSubmit = async () => {
    setSubmitLoading(true);
    setFormError(null);
    try {
      if (!code.trim()) throw new Error('Course code is required');
      if (!title.trim()) throw new Error('Course title is required');
      if (!departmentId) throw new Error('Department is required');
      if (courseOutcomes.length === 0) throw new Error('At least one Course Outcome (CO) is required');

      for (const co of courseOutcomes) {
        if (!/^CO\d+$/.test(co.code)) throw new Error(`CO Code "${co.code}" must be format CO1, CO2, etc.`);
        if (co.description.length < 10) throw new Error(`CO ${co.code} description must be at least 10 characters`);
      }



      const payload = {
        code: code.trim().toUpperCase(),
        title: title.trim(),
        credits: Number(credits),
        type,
        department: departmentId,
        program: programId || null,
        courseOutcomes,
        coPoMapping,
      };

      if (selectedCourse) {
        await apiPut(`/courses/${selectedCourse._id}`, payload);
        showToast('Course updated successfully', 'success');
      } else {
        await apiPost('/courses', payload);
        showToast('Course created successfully', 'success');
      }

      setIsFormOpen(false);
      fetchCourses();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'An error occurred');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCourse) return;
    setSubmitLoading(true);
    try {
      await apiDelete(`/courses/${selectedCourse._id}`);
      showToast('Course deleted successfully', 'success');
      setIsDeleteOpen(false);
      fetchCourses();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete course', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const filteredPrograms = programs.filter((p) => {
    const pDeptId = typeof p.department === 'object' ? p.department._id : p.department;
    return pDeptId === departmentId;
  });

  const columns: ColumnConfig<ICourse>[] = [
    { key: 'code', label: 'Code' },
    { key: 'title', label: 'Title' },
    { key: 'credits', label: 'Credits', render: (item) => `${item.credits} CR` },
    { key: 'type', label: 'Type', render: (item) => item.type.toUpperCase() },
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
      key: 'courseOutcomes',
      label: 'COs',
      render: (item) => item.courseOutcomes?.length || 0
    }
  ];

  return (
    <RoleGuard allowedRoles={["HOD", "hod"]}>
      <DashboardLayout title="HOD: Courses">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          meta={meta}
          onPageChange={setPage}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search courses..."
          onEdit={openEditModal}
          onDelete={openDeleteConfirm}
          extraActions={(item) => (
            <button
              onClick={() => openMatrixView(item)}
              className="px-2 py-1 border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono uppercase tracking-tight text-zinc-600 dark:text-zinc-400 hover:border-zinc-955 dark:hover:border-zinc-205 cursor-pointer"
            >
              Matrix
            </button>
          )}
          topActions={
            <button
              onClick={openCreateModal}
              className="px-3 py-2 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
            >
              NEW COURSE
            </button>
          }
        />

        {/* Create/Edit Form Modal */}
        <FormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={selectedCourse ? `Edit Course: ${selectedCourse.code}` : "New Course"}
          onSubmit={handleSubmit}
          loading={submitLoading}
          size="xl"
        >
          {formError && (
            <div className="p-3 border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-mono">
              {formError.toUpperCase()}
            </div>
          )}

          {/* Basic Course Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <FormField label="Course Code" hint="e.g. CSE-101">
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none uppercase"
              />
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Course Title" hint="e.g. Structured Programming Language">
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
                />
              </FormField>
            </div>

            <FormField label="Credits">
              <input
                type="number"
                step="0.5"
                required
                min="0"
                max="10"
                value={credits}
                onChange={(e) => setCredits(Number(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField label="Type">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
              >
                <option value="theory">THEORY</option>
                <option value="lab">LAB</option>
                <option value="project">PROJECT</option>
              </select>
            </FormField>

            <FormField label="Department">
              <select
                value={departmentId}
                required
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setProgramId('');
                  setCoPoMapping([]);
                }}
                className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
              >
                <option value="">SELECT DEPARTMENT</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Program (Optional)">
              <select
                value={programId}
                disabled={!departmentId}
                onChange={(e) => {
                  setProgramId(e.target.value);
                  setCoPoMapping([]);
                }}
                className="mt-1 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none disabled:opacity-50"
              >
                <option value="">NONE / MULTI-PROGRAM</option>
                {filteredPrograms.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Section 1: Course Outcomes */}
          <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-mono font-bold tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">
                1. Course Outcomes (CO)
              </h4>
              <button
                type="button"
                onClick={handleAddCO}
                className="px-2.5 py-1 border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono uppercase hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:text-zinc-300 cursor-pointer"
              >
                + Add CO
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {courseOutcomes.map((co, index) => (
                <div key={index} className="flex gap-4 items-start border border-dashed border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50/30 dark:bg-zinc-900/10">
                  <div className="w-20">
                    <label className="block text-[9px] font-mono text-zinc-400">CO CODE</label>
                    <input
                      type="text"
                      required
                      value={co.code}
                      placeholder="CO1"
                      onChange={(e) => handleCOChange(index, 'code', e.target.value)}
                      className="mt-1 block w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none uppercase"
                    />
                  </div>
                  <div className="w-36">
                    <label className="block text-[9px] font-mono text-zinc-400">BLOOM LEVEL</label>
                    <select
                      value={co.bloomLevel}
                      onChange={(e) => handleCOChange(index, 'bloomLevel', e.target.value)}
                      className="mt-1 block w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
                    >
                      <option value="Remember">Remember</option>
                      <option value="Understand">Understand</option>
                      <option value="Apply">Apply</option>
                      <option value="Analyze">Analyze</option>
                      <option value="Evaluate">Evaluate</option>
                      <option value="Create">Create</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[9px] font-mono text-zinc-400">DESCRIPTION (MIN 10 CHARS)</label>
                    <input
                      type="text"
                      required
                      value={co.description}
                      placeholder="Enter outcomes description..."
                      onChange={(e) => handleCOChange(index, 'description', e.target.value)}
                      className="mt-1 block w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none"
                    />
                  </div>
                  {courseOutcomes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCO(index)}
                      className="mt-4 px-2 py-1 border border-red-200 dark:border-red-950 text-[10px] font-mono text-red-600 dark:text-red-400 hover:border-red-500 cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: CO-PO Mapping */}
          <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-mono font-bold tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">
                2. CO-PO / PSO Mapping Matrix
              </h4>
              <button
                type="button"
                onClick={handleAddMapping}
                className="px-2.5 py-1 border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono uppercase hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:text-zinc-300 cursor-pointer"
              >
                + Add Mapping
              </button>
            </div>

            {coPoMapping.length === 0 ? (
              <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase italic">
                No mappings specified.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-52 overflow-y-auto pr-1">
                {coPoMapping.map((map, index) => (
                  <div key={index} className="flex gap-3 items-center border border-dashed border-zinc-200 dark:border-zinc-800 p-2 bg-zinc-50/30 dark:bg-zinc-900/10">
                    <div className="w-1/3">
                      <select
                        value={map.co}
                        onChange={(e) => handleMappingChange(index, 'co', e.target.value)}
                        className="w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono text-xs focus:outline-none"
                      >
                        {courseOutcomes.map(co => (
                          <option key={co.code} value={co.code}>{co.code}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-1/3">
                      <select
                        value={map.po}
                        onChange={(e) => handleMappingChange(index, 'po', e.target.value)}
                        className="w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono text-xs focus:outline-none"
                      >
                        {availablePOs.map(po => (
                          <option key={po.code} value={po.code}>{po.code}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-1/4">
                      <select
                        value={map.weight}
                        onChange={(e) => handleMappingChange(index, 'weight', Number(e.target.value))}
                        className="w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono text-xs focus:outline-none"
                      >
                        <option value="1">1 (Low)</option>
                        <option value="2">2 (Med)</option>
                        <option value="3">3 (High)</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMapping(index)}
                      className="px-2 py-1 border border-red-200 dark:border-red-950 text-[10px] font-mono text-red-600 dark:text-red-400 hover:border-red-500 cursor-pointer"
                    >
                      [X]
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FormModal>

        {/* CO-PO Matrix Visualization Modal */}
        <FormModal
          isOpen={isMatrixOpen}
          onClose={() => setIsMatrixOpen(false)}
          title={`CO-PO Mapping Matrix: ${selectedCourse?.code || ''}`}
          size="lg"
        >
          {matrixLoading ? (
            <div className="py-12 flex justify-center items-center">
              <div className="h-6 w-6 border-2 border-zinc-800 dark:border-zinc-200 border-t-transparent animate-spin"></div>
            </div>
          ) : !matrixData ? (
            <p className="text-center font-mono text-xs text-zinc-400">FAILED TO LOAD MATRIX DATA.</p>
          ) : (
            <div className="space-y-6">
              <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-x-auto rounded-none">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                      <th className="px-4 py-3 text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase">
                        COs / POs
                      </th>
                      {matrixData.programOutcomes.map((po: any) => (
                        <th
                          key={po.code}
                          title={po.description}
                          className="px-4 py-3 text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase text-center border-l border-zinc-200 dark:border-zinc-800"
                        >
                          {po.code}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.matrix.map((row: any) => (
                      <tr key={row.co.code} className="border-b border-zinc-200 dark:border-zinc-800 last:border-none">
                        <td className="px-4 py-3 text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-50" title={row.co.description}>
                          {row.co.code} <span className="text-[10px] font-normal text-zinc-400 font-sans">({row.co.bloomLevel})</span>
                        </td>
                        {row.mappings.map((mapping: any) => (
                          <td
                            key={mapping.po}
                            className="px-4 py-3 text-xs font-mono text-center border-l border-zinc-200 dark:border-zinc-800 font-bold"
                          >
                            {mapping.weight > 0 ? (
                              <span className={`inline-block w-6 py-0.5 text-center ${
                                mapping.weight === 3 
                                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' 
                                  : 'bg-zinc-450 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100'
                              }`}>
                                {mapping.weight}
                              </span>
                            ) : (
                              <span className="text-zinc-300 dark:text-zinc-700 font-light">-</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 space-y-1">
                <p className="font-bold">LEGEND WEIGHTS:</p>
                <div className="flex gap-4">
                  <span>[1] LOW MAPPING</span>
                  <span>[2] MEDIUM MAPPING</span>
                  <span>[3] HIGH MAPPING</span>
                </div>
              </div>
            </div>
          )}
        </FormModal>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={handleDelete}
          title="Delete Course"
          message={`Are you sure you want to delete course "${selectedCourse?.title || ''}" (${selectedCourse?.code || ''})?`}
          loading={submitLoading}
        />
      </DashboardLayout>
    </RoleGuard>
  );
}
