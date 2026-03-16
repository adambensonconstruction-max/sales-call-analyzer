import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPracticeSessions, createPracticeSession, sendPracticeMessage } from '@/lib/api';
import toast from 'react-hot-toast';

export function usePracticeSessions(params?: { limit?: number; completed?: boolean }) {
  return useQuery({
    queryKey: ['practice-sessions', params],
    queryFn: () => fetchPracticeSessions(params),
    select: (data) => data.data,
  });
}

export function useCreatePracticeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPracticeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practice-sessions'] });
      toast.success('Practice session started');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSendPracticeMessage() {
  return useMutation({
    mutationFn: ({ sessionId, message }: { sessionId: string; message: string }) =>
      sendPracticeMessage(sessionId, message),
    onError: (err: Error) => toast.error(err.message),
  });
}
