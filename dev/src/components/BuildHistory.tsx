interface Build {
  id: string;
  buildNumber: number;
  stagingUrl: string;
  devName: string;
  claudeModel: string;
  createdAt: { _seconds: number } | null;
}

interface BuildHistoryProps {
  builds: Build[];
  approvedBuildId: string | null;
}

function timeStr(seconds: number) {
  return new Date(seconds * 1000).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function BuildHistory({ builds, approvedBuildId }: BuildHistoryProps) {
  if (builds.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">No builds yet.</p>;
  }

  return (
    <div className="space-y-2">
      {builds.map((build) => (
        <div
          key={build.id}
          className={`flex items-center justify-between p-3 rounded-xl border ${
            approvedBuildId === build.id
              ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-900 dark:text-white w-16">
              Build {build.buildNumber}
            </span>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {build.devName} · {build.claudeModel}
                {build.createdAt && ` · ${timeStr(build.createdAt._seconds)}`}
              </p>
            </div>
            {approvedBuildId === build.id && (
              <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-full font-medium">
                Approved
              </span>
            )}
          </div>
          <a
            href={build.stagingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-2.5 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-[#2087e6] dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors font-medium"
          >
            View staging →
          </a>
        </div>
      ))}
    </div>
  );
}
