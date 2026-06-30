import { NavLink, Navigate, Outlet, useParams } from 'react-router-dom';
import TopBar from './TopBar';
import { JobProvider, useJob } from '../context/JobContext';

function TabLink({ to, icon, label, dot }: { to: string; icon: React.ReactNode; label: string; dot?: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative flex items-center gap-1.5 px-4 h-full text-sm font-medium border-b-2 transition-colors ${
          isActive
            ? 'border-[#2087e6] text-[#2087e6] dark:text-blue-400 dark:border-blue-500'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
        }`
      }
    >
      {icon}
      {label}
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
      )}
    </NavLink>
  );
}

function JobLayoutInner({ slug }: { slug: string }) {
  const { job, loading, error, validationNeeded } = useJob();

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-[#1e1e1e]">
      <TopBar jobName={job?.businessName ?? undefined} jobStatus={job?.status ?? undefined} />

      {/* Tab strip */}
      <div className="flex-shrink-0 h-9 flex items-stretch border-b border-gray-200 dark:border-[#2d2d2d] bg-gray-50 dark:bg-[#252526] px-2">
        <TabLink
          to={`/job/${slug}/editor`}
          icon={<EditorIcon />}
          label="Editor"
          dot={validationNeeded}
        />
        <TabLink to={`/job/${slug}/preview`} icon={<PreviewIcon />} label="Preview" />
        <TabLink to={`/job/${slug}/deploy`} icon={<DeployIcon />} label="Deploy" />
        <TabLink to={`/job/${slug}/builds`} icon={<HistoryIcon />} label="Builds" />
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-[#2087e6] border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <div className="p-8 text-sm text-red-600 dark:text-red-400">{error}</div>
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  );
}

export default function JobLayout() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return <Navigate to="/" replace />;

  return (
    <JobProvider slug={slug}>
      <JobLayoutInner slug={slug} />
    </JobProvider>
  );
}

function EditorIcon() {
  return (
    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );
}

function PreviewIcon() {
  return (
    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function DeployIcon() {
  return (
    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
