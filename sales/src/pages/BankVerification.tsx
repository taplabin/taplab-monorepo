import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { brokerFetch } from '../lib/api';
import { useToast } from '../components/Toast';
import useSWR from 'swr';

interface Props {
  onVerified: () => void;
}

export default function BankVerification({ onVerified }: Props) {
  const toast = useToast();
  const [verifying, setVerifying] = useState(false);

  const { data: profile } = useSWR('/api/broker/me', async (url) => {
    const res = await brokerFetch(url);
    return res.json();
  });

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await brokerFetch('/api/broker/verify-bank', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast('Bank details verified');
      onVerified();
    } catch (err: any) {
      toast(err.message || 'Verification failed', 'error');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Verify your bank details</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Please confirm the details below before accessing the portal. Once verified, payouts will be sent to this account.
            </p>
          </div>

          {profile ? (
            <dl className="space-y-3">
              {[
                { label: 'Account Number', value: profile.bankAccountNumber ?? 'Not set' },
                { label: 'IFSC Code', value: profile.bankIfsc ?? 'Not set' },
                { label: 'UPI ID', value: profile.upiId ?? 'Not set' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">{label}</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white font-mono">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded" />)}
            </div>
          )}

          {profile && !profile.bankAccountNumber && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Bank details not set yet. Contact your TapLab admin to add your bank account.
            </p>
          )}

          <div className="space-y-3">
            <button
              onClick={handleVerify}
              disabled={verifying || !profile?.bankAccountNumber}
              className="w-full py-2.5 bg-[#2087e6] hover:bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              {verifying ? 'Verifying…' : 'Confirm & Continue'}
            </button>
            <button
              onClick={() => signOut(auth)}
              className="w-full py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
