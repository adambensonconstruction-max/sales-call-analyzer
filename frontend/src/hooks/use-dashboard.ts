import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats } from '@/lib/api';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    select: (data) => data.data,
    staleTime: 1000 * 60 * 5,
  });
}
