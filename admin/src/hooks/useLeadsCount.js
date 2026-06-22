import useSWR from 'swr';
import { adminFetch } from '../lib/api';
export function useLeadsCount() {
    const { data } = useSWR('/api/admin/leads?status=pending', async (url) => {
        const res = await adminFetch(url);
        const json = await res.json();
        return json.leads?.length ?? 0;
    }, { refreshInterval: 60000 });
    return data ?? 0;
}
