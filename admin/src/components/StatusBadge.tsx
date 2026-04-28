interface StatusBadgeProps {
  status: 'active' | 'inactive';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {status === 'active' ? 'Active' : 'Inactive'}
    </span>
  );
}
