import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCalls, fetchCall, uploadCall, deleteCall, fetchTranscript } from '@/lib/api';
import toast from 'react-hot-toast';

export function useCalls(params?: { limit?: number; status?: string }) {
  return useQuery({
    queryKey: ['calls', params],
    queryFn: () => fetchCalls(params),
    select: (data) => data.data,
  });
}

export function useCall(callId: string) {
  return useQuery({
    queryKey: ['calls', callId],
    queryFn: () => fetchCall(callId),
    select: (data) => data.data,
    enabled: !!callId,
  });
}

export function useTranscript(callId: string) {
  return useQuery({
    queryKey: ['transcript', callId],
    queryFn: () => fetchTranscript(callId),
    select: (data) => data.data,
    enabled: !!callId,
  });
}

export function useUploadCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, name }: { file: File; name?: string }) => uploadCall(file, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      toast.success('Call uploaded successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Upload failed');
    },
  });
}

export function useDeleteCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCall,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      toast.success('Call deleted');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Delete failed');
    },
  });
}
