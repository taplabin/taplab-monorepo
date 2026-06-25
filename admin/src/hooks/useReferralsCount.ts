import useSWR from 'swr';
import { adminFetch } from '../lib/api';

export function useReferralsCount(): number {
  const { data } = useSWR('/api/admin/broker-referrals?status=pending', async (url: string) => {
    const res = await adminFetch(url);
    const json = await res.json();
    if (!res.ok) return [];
    return json.referrals as any[];
  }, { refreshInterval: 60000 });
  return data?.length ?? 0;
}
