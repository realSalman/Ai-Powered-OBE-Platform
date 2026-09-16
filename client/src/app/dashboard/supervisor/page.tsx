"use client";

import RoleGuard from "@/components/RoleGuard";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";

export default function SupervisorDashboard() {
  const { user } = useAuth();

  return (
    <RoleGuard allowedRoles={["supervisor"]}>
      <DashboardLayout title="Supervisor Dashboard">
        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-mono font-bold tracking-tight text-zinc-900 dark:text-zinc-50 uppercase mb-4">
            Supervisor Profile
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <p className="text-[10px] font-mono text-zinc-400 uppercase">Teacher Initial</p>
              <p className="text-sm font-mono font-semibold mt-1">{user?.teacherInitial || 'N/A'}</p>
            </div>
            <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <p className="text-[10px] font-mono text-zinc-400 uppercase">Department</p>
              <p className="text-sm font-mono font-semibold mt-1">{user?.department || 'N/A'}</p>
            </div>
          </div>
          
          <div className="p-6 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
            <h3 className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-300 uppercase mb-2">Section Allocation</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-light">
              As a supervisor, you can allocate sections and assign students to groups under your batch.
            </p>
          </div>
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
}
