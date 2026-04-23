interface StatusBadgeProps {
  status: 'not_started' | 'in_progress' | 'completed'
}

const config = {
  not_started: { label: 'Not Started', className: 'bg-gray-700 text-gray-200' },
  in_progress: { label: 'In Progress', className: 'bg-blue-900 text-blue-200' },
  completed: { label: 'Completed', className: 'bg-green-900 text-green-200' },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = config[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
