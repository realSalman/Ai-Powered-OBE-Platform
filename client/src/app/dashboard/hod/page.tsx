"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useDepartmentName } from "@/hooks/useDepartmentName";
import { apiGet } from "@/lib/api";

export default function HODDashboard() {
  const { user } = useAuth();
  const { name: departmentName, loading: deptLoading } = useDepartmentName(user?.department);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFaculties = async () => {
      try {
        const res = await apiGet<any[]>('/admin/users', { role: 'faculty' });
        setFaculties(res.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load department faculty');
      } finally {
        setLoading(false);
      }
    };
    fetchFaculties();
  }, []);

  return (
    <RoleGuard allowedRoles={["HOD"]}>
      <DashboardLayout title="HOD Dashboard">
        <div className="space-y-6">
          <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none">
            <h2 className="text-sm font-mono font-bold tracking-tight text-zinc-900 dark:text-zinc-50 uppercase mb-4">
              Department Head Profile
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-none">
                <p className="text-[10px] font-mono text-zinc-400 uppercase">Teacher Initial</p>
                <p className="text-sm font-mono font-semibold mt-1">{user?.teacherInitial || 'N/A'}</p>
              </div>
              <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-none">
                <p className="text-[10px] font-mono text-zinc-400 uppercase">Department</p>
                <p className="text-sm font-mono font-semibold mt-1">{deptLoading ? '...' : departmentName}</p>
              </div>
            </div>
          </div>
          
          <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none">
            <h3 className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 uppercase mb-4">Department Faculty</h3>
            
            {error && (
              <div className="mb-4 p-3 border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-mono">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-xs font-mono text-zinc-500 py-4">Loading faculty members...</div>
            ) : faculties.length === 0 ? (
              <div className="text-xs font-mono text-zinc-500 py-4">No faculty members found in your department.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-4 py-3 font-semibold uppercase">Initial</th>
                      <th className="px-4 py-3 font-semibold uppercase">Name</th>
                      <th className="px-4 py-3 font-semibold uppercase">Email</th>
                      <th className="px-4 py-3 font-semibold uppercase">Roles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {faculties.map((fac, i) => (
                      <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-bold">
                          {fac.teacherInitial || '-'}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                          {fac.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                          {fac.email || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {fac.roles?.map((r: string) => (
                              <span key={r} className="inline-flex px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-[9px] uppercase border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">
                                {r}
                              </span>
                            ))}
                          </div>
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
