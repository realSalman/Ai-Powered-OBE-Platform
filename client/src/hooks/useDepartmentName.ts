import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { IDepartment } from '@/types/api';

export function useDepartmentName(departmentId?: string | null) {
  const [name, setName] = useState<string>('Loading...');
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!departmentId) {
      setName('N/A');
      return;
    }

    let isMounted = true;

    const fetchDept = async () => {
      setLoading(true);
      try {
        const res = await apiGet<IDepartment>(`/departments/${departmentId}`);
        if (isMounted) {
          setName(res.data.name);
          setCode(res.data.code);
        }
      } catch (err: any) {
        if (isMounted) {
          setName('Unknown');
          setError(err.message || 'Failed to load department');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDept();

    return () => {
      isMounted = false;
    };
  }, [departmentId]);

  return { name, code, loading, error };
}
