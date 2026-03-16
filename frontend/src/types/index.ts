// ============================================================================
// Core Types — Sales Call Analyzer
// ============================================================================

// Enums matching database
export type CallStatus = 'uploading' | 'transcribing' | 'analyzing' | 'completed' | 'failed';
export type SpeakerRole = 'seller' | 'buyer' | 'unknown';
export type PracticeType = 'roleplay' | 'objection_handling' | 'discovery' | 'closing' | 'storytelling';
export type PracticeDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type UserRole = 'user' | 'manager' | 'admin';
export type StoryCategory = 'success' | 'objection_overcome' | 'rapport_building' | 'closing' | 'discovery' | 'pain_point' | 'custom';

// User / Profile
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  team_id: string | null;
  locale: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Call
export interface Call {
  id: string;
  user_id: string;
  name: string | null;
  status: CallStatus;
  duration_secs: number | null;
  file_path: string | null;
  file_size_bytes: number | null;
  file_mime_type: string | null;
  language: string;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Populated by backend when fetching call details
  transcript_segments?: TranscriptSegment[];
}

// Transcript Segment
export interface TranscriptSegment {
  id: string;
  call_id: string;
  speaker_label: string;
  speaker_role: SpeakerRole;
  text: string;
  start_ms: number;
  end_ms: number;
  confidence: number | null;
  word_count: number;
  seq: number;
  created_at: string;
}

// Analysis
export interface Analysis {
  id: string;
  call_id: string;
  user_id: string;
  overall_score: number | null;
  discovery_score: number | null;
  rapport_score: number | null;
  objection_score: number | null;
  closing_score: number | null;
  storytelling_score: number | null;
  persuasion_score: number | null;
  summary: string | null;
  strengths: AnalysisItem[];
  improvements: ImprovementItem[];
  objections_detected: ObjectionItem[];
  discovery_questions: DiscoveryItem[];
  persuasion_techniques: PersuasionItem[];
  stories_used: StoryUsedItem[];
  subconscious_cues: CueItem[];
  pain_points: PainPointItem[];
  talk_ratio: TalkRatio;
  model_used: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalysisItem {
  title: string;
  detail: string;
  timestamp_ms?: number;
}

export interface ImprovementItem extends AnalysisItem {
  suggestion: string;
}

export interface ObjectionItem {
  text: string;
  timestamp_ms: number;
  handling: string;
  better_response: string;
}

export interface DiscoveryItem {
  question: string;
  timestamp_ms: number;
  effectiveness: string;
}

export interface PersuasionItem {
  technique: string;
  example: string;
  timestamp_ms: number;
}

export interface StoryUsedItem {
  summary: string;
  timestamp_ms: number;
  effectiveness: string;
}

export interface CueItem {
  cue: string;
  context: string;
  timestamp_ms: number;
}

export interface PainPointItem {
  pain: string;
  timestamp_ms: number;
  leveraged: boolean;
}

export interface TalkRatio {
  seller_pct?: number;
  buyer_pct?: number;
}

// Practice Session
export interface PracticeSession {
  id: string;
  user_id: string;
  type: PracticeType;
  difficulty: PracticeDifficulty;
  scenario: Record<string, unknown>;
  messages: PracticeMessage[];
  feedback: Record<string, unknown> | null;
  score: number | null;
  duration_secs: number | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface PracticeMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

// Story
export interface Story {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: StoryCategory;
  tags: string[];
  source_call_id: string | null;
  is_template: boolean;
  effectiveness: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Dashboard Stats
export interface DashboardStats {
  total_calls: number;
  analyzed_calls: number;
  avg_score: number | null;
  practice_sessions: number;
  total_call_minutes: number;
  score_trend: ScoreTrend[] | null;
  category_averages: CategoryAverages | null;
}

export interface ScoreTrend {
  week: string;
  avg_score: number;
  call_count: number;
}

export interface CategoryAverages {
  discovery: number | null;
  rapport: number | null;
  objection: number | null;
  closing: number | null;
  storytelling: number | null;
  persuasion: number | null;
}

// Processing Job
export interface ProcessingJob {
  id: string;
  call_id: string;
  user_id: string;
  job_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  error: string | null;
  created_at: string;
}

// API Response
export interface ApiResponse<T> {
  data: T;
  meta?: {
    cursor?: string;
    limit?: number;
    has_more?: boolean;
  };
}
