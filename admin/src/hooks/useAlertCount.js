import useSWR from 'swr';
import { adminFetch } from '../lib/api';
export function useAlertCount() {
    const { data: businesses } = useSWR('/api/admin/business', async (url) => {
        const res = await adminFetch(url);
        const json = await res.json();
        return json.businesses;
    });
    if (!businesses)
        return 0;
    const now = Date.now();
    const trialsExpiringSoon = businesses.filter((b) => {
        if (!b.freeTrialEnabled || !b.trialStartDate)
            return false;
        const trialEnd = b.trialStartDate.seconds * 1000 + b.trialDurationDays * 86400000;
        const d = (trialEnd - now) / 86400000;
        return d > 0 && d <= 7;
    }).length;
    const cancelledExpiringSoon = businesses.filter((b) => {
        if (b.subscriptionStatus !== 'cancelled' || !b.subscriptionEndsAt)
            return false;
        const d = (b.subscriptionEndsAt.seconds * 1000 - now) / 86400000;
        return d > 0 && d <= 7;
    }).length;
    const inactive = businesses.filter((b) => {
        if (b.subscriptionStatus === 'active' || b.subscriptionStatus === 'cancelled')
            return false;
        if (b.freeTrialEnabled && b.trialStartDate) {
            const trialEnd = b.trialStartDate.seconds * 1000 + b.trialDurationDays * 86400000;
            if (now < trialEnd)
                return false;
        }
        return true;
    }).length;
    const noPage = businesses.filter((b) => {
        if (b.pageStatus !== 'no_page')
            return false;
        return (now - b.createdAt.seconds * 1000) / 86400000 >= 14;
    }).length;
    return trialsExpiringSoon + cancelledExpiringSoon + inactive + noPage;
}
