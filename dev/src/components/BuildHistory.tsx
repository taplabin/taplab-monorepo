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
    return <p className="text-sm text-gray-400">No builds yet.</p>;
  }

  return (
    <div className="space-y-2">
      {builds.map((build) => (
        <div
          key={build.id}
          className={`flex items-center justify-between p-3 rounded-xl border ${
            approvedBuildId === build.id
              ? 'border-green-300 bg-green-50'
              : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-900 w-16">
              Build {build.buildNumber}
            </span>
            <div>
              <p className="text-xs text-gray-500">
                {build.devName} · {build.claudeModel}
                {build.createdAt && ` · ${timeStr(build.createdAt._seconds)}`}
              </p>
            </div>
            {approvedBuildId === build.id && (
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                Approved
              </span>
            )}
          </div>
          <a
            href={build.stagingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-2.5 py-1.5 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors font-medium"
          >
            View staging →
          </a>
        </div>
      ))}
    </div>
  );
}
