import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { brokerFetch } from '../lib/api';
import Layout from '../components/Layout';
import { Skeleton } from '../components/Skeleton';

export default function Team() {
  const navigate = useNavigate();

  const { data } = useSWR('/api/broker/team', async (url) => {
    const res = await brokerFetch(url);
    return (await res.json()).brokers as any[];
  });

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Team</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            {data ? `${data.length} member${data.length !== 1 ? 's' : ''} in the network` : 'TapLab sales network'}
          </p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {!data ? (
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="w-16 h-16 rounded-full" />
                <Skeleton className="h-3 w-14 rounded" />
              </div>
            ))
          ) : data.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 col-span-full py-8 text-center">No team members yet.</p>
          ) : data.map((broker: any) => (
            <button
              key={broker.id}
              onClick={() => navigate(`/profile/${broker.id}`)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0 ring-2 ring-transparent group-hover:ring-[#2087e6] transition-all duration-150">
                {broker.photoUrl ? (
                  <img src={broker.photoUrl} alt={broker.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-400 dark:text-gray-500">
                    {broker.name?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="text-center min-w-0 w-full">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{broker.name?.split(' ')[0]}</p>
                {broker.city && <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{broker.city}</p>}
                <p className="text-[10px] text-gray-400 dark:text-gray-500">{broker.dealsAllTime ?? 0} deals</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
}
