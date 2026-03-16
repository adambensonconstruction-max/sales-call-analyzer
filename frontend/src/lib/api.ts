import { supabase } from './supabase';
import type {
  ApiResponse,
  Call,
  Analysis,
  TranscriptSegment,
  DashboardStats,
  PracticeSession,
  Story,
  ProcessingJob,
} from '@/types';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || err.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ─── Calls ──────────────────────────────────────────────────────────────────

export async function fetchCalls(params?: {
  limit?: number;
  cursor?: string;
  status?: string;
}): Promise<ApiResponse<Call[]>> {
  const q = new URLSearchParams();
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.cursor) q.set('cursor', params.cursor);
  if (params?.status) q.set('status', params.status);
  const qs = q.toString();
  return apiFetch(`/calls${qs ? `?${qs}` : ''}`);
}

export async function fetchCall(callId: string): Promise<ApiResponse<Call>> {
  return apiFetch(`/calls/${callId}`);
}

export async function uploadCall(file: File, name?: string): Promise<ApiResponse<Call>> {
  const headers = await getAuthHeaders();
  delete (headers as Record<string, string>)['Content-Type'];

  const formData = new FormData();
  formData.append('file', file);
  if (name) formData.append('name', name);

  const res = await fetch(`${API_BASE}/calls`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Upload failed: ${res.status}`);
  }

  return res.json();
}

export async function deleteCall(callId: string): Promise<void> {
  await apiFetch(`/calls/${callId}`, { method: 'DELETE' });
}

// ─── Transcript ─────────────────────────────────────────────────────────────

export async function fetchTranscript(callId: string): Promise<ApiResponse<TranscriptSegment[]>> {
  return apiFetch(`/calls/${callId}/transcript`);
}

// ─── Analysis ───────────────────────────────────────────────────────────────

export async function fetchAnalysis(callId: string): Promise<ApiResponse<Analysis>> {
  return apiFetch(`/analysis/calls/${callId}`);
}

export async function triggerAnalysis(callId: string, force = false): Promise<ApiResponse<Analysis>> {
  return apiFetch(`/analysis/calls/${callId}?force=${force}`, { method: 'POST' });
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export async function fetchDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  return apiFetch('/dashboard');
}

// ─── Practice ───────────────────────────────────────────────────────────────

export async function fetchPracticeSessions(params?: {
  limit?: number;
  completed?: boolean;
}): Promise<ApiResponse<PracticeSession[]>> {
  const q = new URLSearchParams();
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.completed !== undefined) q.set('completed', String(params.completed));
  const qs = q.toString();
  return apiFetch(`/practice/sessions${qs ? `?${qs}` : ''}`);
}

export async function createPracticeSession(data: {
  type: string;
  difficulty: string;
  scenario?: Record<string, unknown>;
}): Promise<ApiResponse<PracticeSession>> {
  return apiFetch('/practice/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function sendPracticeMessage(
  sessionId: string,
  message: string
): Promise<ApiResponse<{ reply: string }>> {
  return apiFetch(`/practice/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

// ─── Stories ────────────────────────────────────────────────────────────────

export async function fetchStories(params?: {
  category?: string;
  tags?: string[];
}): Promise<ApiResponse<Story[]>> {
  const q = new URLSearchParams();
  if (params?.category) q.set('category', params.category);
  if (params?.tags?.length) q.set('tags', params.tags.join(','));
  const qs = q.toString();
  return apiFetch(`/stories${qs ? `?${qs}` : ''}`);
}

export async function createStory(data: {
  title: string;
  content: string;
  category: string;
  tags?: string[];
}): Promise<ApiResponse<Story>> {
  return apiFetch('/stories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateStory(
  storyId: string,
  data: Partial<Story>
): Promise<ApiResponse<Story>> {
  return apiFetch(`/stories/${storyId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteStory(storyId: string): Promise<void> {
  await apiFetch(`/stories/${storyId}`, { method: 'DELETE' });
}

// ─── Processing Jobs ────────────────────────────────────────────────────────

export async function fetchCallJobs(callId: string): Promise<ApiResponse<ProcessingJob[]>> {
  return apiFetch(`/calls/${callId}/jobs`);
}
