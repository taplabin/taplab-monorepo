import useSWR from 'swr';
import { adminFetch } from '../lib/api';

export function useJobsCount(): number {
  const { data } = useSWR('/api/admin/jobs?status=in_review', async (url: string) => {
    const res = await adminFetch(url);
    const json = await res.json();
    if (!res.ok) return [];
    return json.jobs as any[];
  }, { refreshInterval: 60000 });
  return data?.length ?? 0;
}
