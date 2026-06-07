export type DisplayStatus = 'active' | 'inactive' | 'cancelled' | 'trial';

interface StatusBadgeProps {
  status: DisplayStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<DisplayStatus, string> = {
    active:    'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
    inactive:  'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
    cancelled: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
    trial:     'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
  };

  const labels: Record<DisplayStatus, string> = {
    active:    'Active',
    inactive:  'Inactive',
    cancelled: 'Cancelled',
    trial:     'Free Trial',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
