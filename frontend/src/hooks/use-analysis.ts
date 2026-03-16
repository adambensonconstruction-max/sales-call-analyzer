import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAnalysis, triggerAnalysis } from '@/lib/api';
import toast from 'react-hot-toast';

export function useAnalysis(callId: string) {
  return useQuery({
    queryKey: ['analysis', callId],
    queryFn: () => fetchAnalysis(callId),
    select: (data) => data.data,
    enabled: !!callId,
    retry: false,
  });
}

export function useTriggerAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ callId, force }: { callId: string; force?: boolean }) =>
      triggerAnalysis(callId, force),
    onSuccess: (_data, { callId }) => {
      queryClient.invalidateQueries({ queryKey: ['analysis', callId] });
      queryClient.invalidateQueries({ queryKey: ['calls', callId] });
      toast.success('Analysis started');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Analysis failed');
    },
  });
}
