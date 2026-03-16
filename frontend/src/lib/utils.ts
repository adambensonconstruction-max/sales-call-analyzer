import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatMs(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  return formatDuration(totalSecs);
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getScoreColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-amber-500';
  return 'text-red-500';
}

export function getScoreGradient(score: number | null): string {
  if (score === null) return 'from-muted to-muted';
  if (score >= 80) return 'from-emerald-500 to-emerald-400';
  if (score >= 60) return 'from-amber-500 to-amber-400';
  return 'from-red-500 to-red-400';
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case 'analyzing': return 'bg-primary/10 text-primary border-primary/20';
    case 'transcribing': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    case 'uploading': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'failed': return 'bg-red-500/10 text-red-500 border-red-500/20';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + '…';
}
