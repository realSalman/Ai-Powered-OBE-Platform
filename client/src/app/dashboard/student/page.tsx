"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useDepartmentName } from "@/hooks/useDepartmentName";
import { apiGet } from "@/lib/api";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { name: departmentName, loading: deptLoading } = useDepartmentName(user?.department);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        const res = await apiGet<any[]>('/enrollments/me');
        setEnrollments(res.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load enrollments');
      } finally {
        setLoading(false);
      }
    };
    fetchEnrollments();
  }, []);

  return (
    <RoleGuard allowedRoles={["student"]}>
      <DashboardLayout title="Student Dashboard">
        <div className="space-y-6">
          <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none">
            <h2 className="text-sm font-mono font-bold tracking-tight text-zinc-900 dark:text-zinc-50 uppercase mb-4">
              Student Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-none">
                <p className="text-[10px] font-mono text-zinc-400 uppercase">Student ID</p>
                <p className="text-sm font-mono font-semibold mt-1">{user?.studentId || 'N/A'}</p>
              </div>
              <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-none">
                <p className="text-[10px] font-mono text-zinc-400 uppercase">Batch</p>
                <p className="text-sm font-mono font-semibold mt-1">{user?.batch || 'N/A'}</p>
              </div>
              <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-none">
                <p className="text-[10px] font-mono text-zinc-400 uppercase">Department</p>
                <p className="text-sm font-mono font-semibold mt-1">{deptLoading ? '...' : departmentName}</p>
              </div>
            </div>
          </div>
          
          <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none">
            <h3 className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 uppercase mb-4">My Enrolled Courses</h3>
            
            {error && (
              <div className="mb-4 p-3 border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-mono">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-xs font-mono text-zinc-500 py-4">Loading courses...</div>
            ) : enrollments.length === 0 ? (
              <div className="text-xs font-mono text-zinc-500 py-4">No enrolled courses found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-4 py-3 font-semibold uppercase">Course Code</th>
                      <th className="px-4 py-3 font-semibold uppercase">Course Title</th>
                      <th className="px-4 py-3 font-semibold uppercase">Semester</th>
                      <th className="px-4 py-3 font-semibold uppercase">Section</th>
                      <th className="px-4 py-3 font-semibold uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {enrollments.map((enr, i) => (
                      <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-semibold">
                          {enr.courseOffering?.course?.code || '-'}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                          {enr.courseOffering?.course?.title || '-'}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                          {enr.courseOffering?.semester?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                          {enr.courseOffering && typeof enr.courseOffering === 'object' && enr.courseOffering.batch && typeof enr.courseOffering.batch === 'object' && enr.courseOffering.section 
                            ? `${enr.courseOffering.batch.code}_${enr.courseOffering.section}` 
                            : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold border ${
                            enr.status === 'active' 
                              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400' 
                              : 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'
                          }`}>
                            {enr.status?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
}
