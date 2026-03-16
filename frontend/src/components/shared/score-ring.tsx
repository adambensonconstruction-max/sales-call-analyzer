import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ScoreRingProps {
  score: number | null;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
  showLabel?: boolean;
  animated?: boolean;
}

export function ScoreRing({
  score,
  size = 80,
  strokeWidth = 6,
  label,
  className,
  showLabel = true,
  animated = true,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = score !== null ? circumference - (score / 100) * circumference : circumference;

  const getColor = () => {
    if (score === null) return '#525252';
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={animated ? { strokeDashoffset: circumference } : { strokeDashoffset: offset }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-bold tabular-nums"
          style={{ fontSize: size * 0.28, color: getColor() }}
        >
          {score !== null ? score : '—'}
        </span>
      </div>
      {showLabel && label && (
        <span className="mt-1.5 text-2xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      )}
    </div>
  );
}
