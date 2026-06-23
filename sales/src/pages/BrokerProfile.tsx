import { useParams, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import { Skeleton } from '../components/Skeleton';

export default function BrokerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useSWR(`/api/broker/profile/${id}`, async (url) => {
    const res = await brokerFetch(url);
    if (!res.ok) return null;
    return res.json() as Promise<any>;
  });

  return (
    <Layout>
      <div className="max-w-lg space-y-5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <Skeleton className="h-20 rounded-xl" />
          </div>
        ) : !data ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Broker not found.</p>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                  {data.photoUrl ? (
                    <img src={data.photoUrl} alt={data.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400">
                      {data.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{data.name}</p>
                  {data.city && <p className="text-sm text-gray-400 dark:text-gray-500">{data.city}</p>}
                </div>
              </div>
              {data.bio && (
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{data.bio}</p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Deals This Month', value: data.dealsThisMonth.toString() },
                { label: 'All Time Deals', value: data.dealsAllTime.toString() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-4">
                  <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
