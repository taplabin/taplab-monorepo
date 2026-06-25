import useSWR from 'swr';
import { adminFetch } from '../lib/api';

export function useCustomerFeedbackCount(): number {
  const { data } = useSWR('/api/admin/customer-feedback', async (url: string) => {
    const res = await adminFetch(url);
    const json = await res.json();
    if (!res.ok) return [];
    return json.feedback as any[];
  }, { refreshInterval: 60000 });
  return data?.filter((f: any) => !f.read).length ?? 0;
}
