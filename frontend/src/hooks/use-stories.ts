import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchStories, createStory, updateStory, deleteStory } from '@/lib/api';
import toast from 'react-hot-toast';

export function useStories(params?: { category?: string; tags?: string[] }) {
  return useQuery({
    queryKey: ['stories', params],
    queryFn: () => fetchStories(params),
    select: (data) => data.data,
  });
}

export function useCreateStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast.success('Story created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateStory>[1] }) =>
      updateStory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast.success('Story updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast.success('Story deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
