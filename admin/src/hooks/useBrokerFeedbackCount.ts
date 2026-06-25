import useSWR from 'swr';
import { adminFetch } from '../lib/api';

export function useBrokerFeedbackCount(): number {
  const { data } = useSWR('/api/admin/broker-feedback', async (url: string) => {
    const res = await adminFetch(url);
    const json = await res.json();
    if (!res.ok) return [];
    return json.feedback as any[];
  }, { refreshInterval: 60000 });
  return data?.filter((f: any) => f.status === 'open').length ?? 0;
}
