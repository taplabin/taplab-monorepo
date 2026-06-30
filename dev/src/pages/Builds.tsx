import { useJob } from '../context/JobContext';

function timeStr(seconds: number) {
  return new Date(seconds * 1000).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function Builds() {
  const { builds, job } = useJob();

  if (builds.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">No builds yet. Push to staging from the Deploy tab to create one.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-[#1e1e1e]">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-5">
          Build history · {builds.length} build{builds.length !== 1 ? 's' : ''}
        </h2>
        <div className="space-y-3">
          {builds.map(build => {
            const isApproved = job?.approvedBuildId === build.id;
            return (
              <div
                key={build.id}
                className={`rounded-xl border p-4 transition-colors ${
                  isApproved
                    ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/10 border-l-4 border-l-green-500'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        Build #{build.buildNumber}
                      </span>
                      {isApproved && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-full font-medium">
                          ✓ Approved
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-2">
                      {build.claudeModel}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {build.devName}
                      {build.createdAt && ` · ${timeStr(build.createdAt._seconds)}`}
                    </p>
                  </div>
                  <a
                    href={build.stagingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-[#2087e6] dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors font-medium"
                  >
                    View staging
                    <ExternalLinkIcon />
                  </a>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <code className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate block">
                    {build.stagingUrl}
                  </code>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ExternalLinkIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}
