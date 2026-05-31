export type DisplayStatus = 'active' | 'inactive' | 'cancelled' | 'trial';

interface StatusBadgeProps {
  status: DisplayStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<DisplayStatus, string> = {
    active:    'bg-green-100 text-green-800',
    inactive:  'bg-red-100 text-red-800',
    cancelled: 'bg-yellow-100 text-yellow-800',
    trial:     'bg-blue-100 text-blue-800',
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
