import { ArrowRight, BadgeCheck, Clock } from 'lucide-react';

export function ActivityStatusIcon({
  status,
  label,
}: {
  status: 'settled' | 'pending';
  label: string;
}) {
  return (
    <span
      className={`activity-status-icon activity-status-${status}`}
      role="img"
      aria-label={label}
    >
      {status === 'settled' ? (
        <BadgeCheck size={19} strokeWidth={2.2} aria-hidden="true" />
      ) : (
        <>
          <Clock size={17} strokeWidth={2} aria-hidden="true" />
          <ArrowRight className="activity-status-arrow" size={10} strokeWidth={2.7} aria-hidden="true" />
        </>
      )}
    </span>
  );
}
