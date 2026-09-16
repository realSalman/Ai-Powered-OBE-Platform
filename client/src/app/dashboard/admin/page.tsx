"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { apiGet, apiPost } from "@/lib/api";
import { IDepartment } from "@/types/api";

export default function AdminDashboard() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [roles, setRoles] = useState<string[]>(["student"]);
  const [department, setDepartment] = useState("");
  const [departments, setDepartments] = useState<IDepartment[]>([]);

  // Student role fields
  const [studentId, setStudentId] = useState("");
  const [batch, setBatch] = useState("");

  // Faculty/HOD/Supervisor role fields
  const [teacherInitial, setTeacherInitial] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await apiGet<IDepartment[]>('/departments', { limit: 100 });
        setDepartments(res.data);
        if (res.data.length > 0) setDepartment(res.data[0]._id);
      } catch (err) {
        console.error('Failed to fetch departments', err);
      }
    };
    fetchDepartments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiPost('/admin/users', {
        email,
        name,
        roles,
        department: department || undefined,
        studentId: roles.includes("student") ? studentId : undefined,
        batch: roles.includes("student") ? batch : undefined,
        teacherInitial: roles.some(r => ["faculty", "HOD", "supervisor"].includes(r)) ? teacherInitial : undefined,
      });

      alert(`Assigned user "${name}" as ${roles.join(', ')} successfully!`);

      // Clear form
      setEmail("");
      setName("");
      setDepartment(departments[0]?._id || "");
      setStudentId("");
      setBatch("");
      setTeacherInitial("");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Create New User">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 rounded-none">
          <h2 className="text-sm font-mono font-bold tracking-tight text-zinc-900 dark:text-zinc-50 uppercase mb-6">
            Assign User
          </h2>
          {error && (
            <div className="mb-4 p-3 border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-mono">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400">NAME</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400">EMAIL ADDRESS</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400">ASSIGNE ROLE</label>
                <select
                  multiple
                  value={roles}
                  onChange={(e) => {
                    const options = Array.from(e.target.selectedOptions);
                    setRoles(options.map(option => option.value));
                  }}
                  className="mt-1.5 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors h-24"
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="HOD">HOD</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="text-[9px] text-zinc-500 mt-1 font-mono">Hold Ctrl/Cmd to select multiple</p>
              </div>
              <div>
                <label className="block text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400">DEPARTMENT</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                >
                  <option value="">SELECT DEPARTMENT</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.code} - {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Conditional Student Fields */}
            {roles.includes("student") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <div>
                  <label className="block text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400">STUDENT ID</label>
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="mt-1.5 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400">BATCH</label>
                  <input
                    type="text"
                    required
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className="mt-1.5 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Conditional Faculty/HOD/Supervisor Fields */}
            {roles.some(r => ["faculty", "HOD", "supervisor"].includes(r)) && (
              <div className="p-4 border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <div className="w-full md:w-1/2">
                  <label className="block text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400">TEACHER INITIAL</label>
                  <input
                    type="text"
                    required
                    value={teacherInitial}
                    onChange={(e) => setTeacherInitial(e.target.value)}
                    className="mt-1.5 block w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "SAVING..." : "SAVE ASSIGNED USER"}
            </button>
          </form>
        </div>

        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 h-fit">
          <h2 className="text-sm font-mono font-bold tracking-tight text-zinc-900 dark:text-zinc-50 uppercase mb-4">
            Overview Info
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-light font-sans">
            Use this form to pre-assign user emails to system roles before they sign in. When an email matches a user's Google authentication address, AtlasAI resolves their local database profile and redirects them to their corresponding dashboard view.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
