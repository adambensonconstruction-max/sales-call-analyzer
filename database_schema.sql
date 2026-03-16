-- ============================================================================
-- Sales Call Analyzer — Complete Supabase Schema
-- Generated: 2026-03-15
-- Target: https://dvxwwdwniqeqslisoknc.supabase.co
-- ============================================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New Query)
-- or via the Supabase CLI: supabase db push
-- ============================================================================

-- ========================  EXTENSIONS  ======================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================  ENUMS  ===========================================

CREATE TYPE call_status AS ENUM (
  'uploading',
  'transcribing',
  'analyzing',
  'completed',
  'failed'
);

CREATE TYPE speaker_role AS ENUM (
  'seller',
  'buyer',
  'unknown'
);

CREATE TYPE practice_type AS ENUM (
  'roleplay',
  'objection_handling',
  'discovery',
  'closing',
  'storytelling'
);

CREATE TYPE practice_difficulty AS ENUM (
  'beginner',
  'intermediate',
  'advanced'
);

CREATE TYPE user_role AS ENUM (
  'user',
  'manager',
  'admin'
);

CREATE TYPE live_session_status AS ENUM (
  'active',
  'paused',
  'ended'
);

CREATE TYPE transcription_provider AS ENUM (
  'assemblyai',
  'deepgram',
  'whisper'
);

CREATE TYPE story_category AS ENUM (
  'success',
  'objection_overcome',
  'rapport_building',
  'closing',
  'discovery',
  'pain_point',
  'custom'
);

-- ========================  TABLES  ==========================================

-- 1. User Profiles (extends Supabase auth.users)
-- -----------------------------------------------
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,
  role          user_role NOT NULL DEFAULT 'user',
  team_id       UUID,                              -- nullable, for team grouping
  locale        TEXT NOT NULL DEFAULT 'en',         -- 'en' | 'he'
  metadata      JSONB DEFAULT '{}',                 -- extensible user prefs
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Teams (optional org hierarchy)
-- -----------------------------------------------
CREATE TABLE public.teams (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  owner_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK from profiles.team_id → teams.id (deferred because of circular dep)
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_team
  FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- 3. Calls
-- -----------------------------------------------
CREATE TABLE public.calls (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT,                                -- display name (auto or user)
  status          call_status NOT NULL DEFAULT 'uploading',
  duration_secs   INTEGER,                             -- audio length
  file_path       TEXT,                                -- Supabase Storage path
  file_size_bytes BIGINT,
  file_mime_type  TEXT,
  transcription_provider transcription_provider,
  language        TEXT DEFAULT 'en',
  error_message   TEXT,                                -- populated on failure
  metadata        JSONB DEFAULT '{}',                  -- flexible extras
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Transcript Segments (diarized utterances)
-- -----------------------------------------------
CREATE TABLE public.transcript_segments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id         UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  speaker_label   TEXT NOT NULL,                       -- raw label from provider
  speaker_role    speaker_role NOT NULL DEFAULT 'unknown',
  text            TEXT NOT NULL,
  start_ms        INTEGER NOT NULL,                    -- milliseconds
  end_ms          INTEGER NOT NULL,
  confidence      REAL,                                -- 0.0–1.0
  word_count      INTEGER GENERATED ALWAYS AS (
                    array_length(string_to_array(trim(text), ' '), 1)
                  ) STORED,
  seq             INTEGER NOT NULL,                    -- ordering within call
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Analyses (one per call — the AI report)
-- -----------------------------------------------
CREATE TABLE public.analyses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id         UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Scores (0-100)
  overall_score         SMALLINT CHECK (overall_score BETWEEN 0 AND 100),
  discovery_score       SMALLINT CHECK (discovery_score BETWEEN 0 AND 100),
  rapport_score         SMALLINT CHECK (rapport_score BETWEEN 0 AND 100),
  objection_score       SMALLINT CHECK (objection_score BETWEEN 0 AND 100),
  closing_score         SMALLINT CHECK (closing_score BETWEEN 0 AND 100),
  storytelling_score    SMALLINT CHECK (storytelling_score BETWEEN 0 AND 100),
  persuasion_score      SMALLINT CHECK (persuasion_score BETWEEN 0 AND 100),

  -- Structured findings
  summary               TEXT,
  strengths             JSONB DEFAULT '[]',             -- [{title, detail, timestamp_ms}]
  improvements          JSONB DEFAULT '[]',             -- [{title, detail, suggestion, timestamp_ms}]
  objections_detected   JSONB DEFAULT '[]',             -- [{text, timestamp_ms, handling, better_response}]
  discovery_questions   JSONB DEFAULT '[]',             -- [{question, timestamp_ms, effectiveness}]
  persuasion_techniques JSONB DEFAULT '[]',             -- [{technique, example, timestamp_ms}]
  stories_used          JSONB DEFAULT '[]',             -- [{summary, timestamp_ms, effectiveness}]
  subconscious_cues     JSONB DEFAULT '[]',             -- [{cue, context, timestamp_ms}]
  pain_points           JSONB DEFAULT '[]',             -- [{pain, timestamp_ms, leveraged}]
  talk_ratio            JSONB DEFAULT '{}',             -- {seller_pct, buyer_pct}

  -- Raw AI response (for debugging / reprocessing)
  raw_ai_response       JSONB,
  model_used            TEXT,                           -- e.g. 'gpt-4o'
  prompt_tokens         INTEGER,
  completion_tokens     INTEGER,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Practice Sessions
-- -----------------------------------------------
CREATE TABLE public.practice_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type            practice_type NOT NULL,
  difficulty      practice_difficulty NOT NULL DEFAULT 'intermediate',
  scenario        JSONB NOT NULL DEFAULT '{}',         -- scenario config
  messages        JSONB NOT NULL DEFAULT '[]',         -- conversation history
  feedback        JSONB,                               -- AI feedback after session
  score           SMALLINT CHECK (score BETWEEN 0 AND 100),
  duration_secs   INTEGER,
  completed       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Story Bank
-- -----------------------------------------------
CREATE TABLE public.stories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  category        story_category NOT NULL DEFAULT 'custom',
  tags            TEXT[] DEFAULT '{}',
  source_call_id  UUID REFERENCES public.calls(id) ON DELETE SET NULL,
  is_template     BOOLEAN NOT NULL DEFAULT false,      -- admin-provided templates
  effectiveness   SMALLINT CHECK (effectiveness BETWEEN 0 AND 100),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Live Sessions (real-time coaching)
-- -----------------------------------------------
CREATE TABLE public.live_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status          live_session_status NOT NULL DEFAULT 'active',
  provider        transcription_provider NOT NULL DEFAULT 'deepgram',
  config          JSONB DEFAULT '{}',                  -- session config
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ
);

-- 9. Live Transcript Chunks (streaming segments)
-- -----------------------------------------------
CREATE TABLE public.live_transcript_chunks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  speaker_label   TEXT,
  text            TEXT NOT NULL,
  start_ms        INTEGER,
  end_ms          INTEGER,
  is_final        BOOLEAN NOT NULL DEFAULT false,
  seq             INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Live Insights (real-time AI coaching tips)
-- -----------------------------------------------
CREATE TABLE public.live_insights (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  insight_type    TEXT NOT NULL,                        -- 'tip', 'warning', 'suggestion'
  content         TEXT NOT NULL,
  context         TEXT,                                -- what triggered it
  timestamp_ms    INTEGER,
  displayed       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Sales Flows (visual sales process builder)
-- -----------------------------------------------
CREATE TABLE public.sales_flows (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  is_template     BOOLEAN NOT NULL DEFAULT false,
  is_public       BOOLEAN NOT NULL DEFAULT false,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Flow Nodes
-- -----------------------------------------------
CREATE TABLE public.flow_nodes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id         UUID NOT NULL REFERENCES public.sales_flows(id) ON DELETE CASCADE,
  node_type       TEXT NOT NULL,                       -- 'step', 'decision', 'action'
  label           TEXT NOT NULL,
  position_x      REAL NOT NULL DEFAULT 0,
  position_y      REAL NOT NULL DEFAULT 0,
  content         JSONB DEFAULT '{}',                  -- scripts, tips, etc.
  parent_id       UUID REFERENCES public.flow_nodes(id) ON DELETE SET NULL,
  seq             INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Conversation Trees
-- -----------------------------------------------
CREATE TABLE public.conversation_trees (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  product_type    TEXT,
  industry        TEXT DEFAULT 'home_improvement',
  is_template     BOOLEAN NOT NULL DEFAULT false,
  is_public       BOOLEAN NOT NULL DEFAULT false,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Tree Nodes
-- -----------------------------------------------
CREATE TABLE public.tree_nodes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id         UUID NOT NULL REFERENCES public.conversation_trees(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES public.tree_nodes(id) ON DELETE CASCADE,
  node_type       TEXT NOT NULL,                       -- 'question', 'response', 'objection', 'close'
  label           TEXT NOT NULL,
  script          TEXT,                                -- suggested script
  tips            TEXT,
  position_x      REAL DEFAULT 0,
  position_y      REAL DEFAULT 0,
  seq             INTEGER NOT NULL DEFAULT 0,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Tree Node Edges (for non-hierarchical connections)
-- -----------------------------------------------
CREATE TABLE public.tree_edges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id         UUID NOT NULL REFERENCES public.conversation_trees(id) ON DELETE CASCADE,
  source_node_id  UUID NOT NULL REFERENCES public.tree_nodes(id) ON DELETE CASCADE,
  target_node_id  UUID NOT NULL REFERENCES public.tree_nodes(id) ON DELETE CASCADE,
  label           TEXT,
  condition       TEXT,                                -- branching condition
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_node_id, target_node_id)
);

-- 16. Mind Maps
-- -----------------------------------------------
CREATE TABLE public.mind_maps (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  data            JSONB NOT NULL DEFAULT '{}',         -- full map structure
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. User Scripts (saved sales scripts)
-- -----------------------------------------------
CREATE TABLE public.user_scripts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  category        TEXT,
  tags            TEXT[] DEFAULT '{}',
  is_favorite     BOOLEAN NOT NULL DEFAULT false,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. Processing Jobs (async job tracking)
-- -----------------------------------------------
CREATE TABLE public.processing_jobs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id         UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_type        TEXT NOT NULL,                       -- 'transcription', 'analysis'
  status          TEXT NOT NULL DEFAULT 'pending',     -- 'pending','running','completed','failed'
  progress        SMALLINT DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  result          JSONB,
  error           TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================  INDEXES  =========================================

-- Calls: user listing (most common query)
CREATE INDEX idx_calls_user_created ON public.calls (user_id, created_at DESC);
CREATE INDEX idx_calls_status ON public.calls (status) WHERE status != 'completed';

-- Transcript segments: by call, ordered
CREATE INDEX idx_segments_call_seq ON public.transcript_segments (call_id, seq);

-- Analyses: by call (1:1 but fast lookup), by user for dashboards
CREATE INDEX idx_analyses_call ON public.analyses (call_id);
CREATE INDEX idx_analyses_user_created ON public.analyses (user_id, created_at DESC);

-- Practice sessions: user history
CREATE INDEX idx_practice_user_created ON public.practice_sessions (user_id, created_at DESC);
CREATE INDEX idx_practice_type ON public.practice_sessions (user_id, type);

-- Stories: user + category
CREATE INDEX idx_stories_user ON public.stories (user_id);
CREATE INDEX idx_stories_category ON public.stories (user_id, category);
CREATE INDEX idx_stories_tags ON public.stories USING gin (tags);

-- Live sessions: active lookup
CREATE INDEX idx_live_sessions_user_status ON public.live_sessions (user_id, status);
CREATE INDEX idx_live_chunks_session ON public.live_transcript_chunks (session_id, seq);
CREATE INDEX idx_live_insights_session ON public.live_insights (session_id, created_at);

-- Sales flows & trees: user listing
CREATE INDEX idx_flows_user ON public.sales_flows (user_id);
CREATE INDEX idx_flow_nodes_flow ON public.flow_nodes (flow_id, seq);
CREATE INDEX idx_trees_user ON public.conversation_trees (user_id);
CREATE INDEX idx_tree_nodes_tree ON public.tree_nodes (tree_id, seq);
CREATE INDEX idx_tree_edges_tree ON public.tree_edges (tree_id);

-- Processing jobs: status lookup
CREATE INDEX idx_jobs_call ON public.processing_jobs (call_id);
CREATE INDEX idx_jobs_user_status ON public.processing_jobs (user_id, status);

-- Mind maps & scripts
CREATE INDEX idx_mind_maps_user ON public.mind_maps (user_id);
CREATE INDEX idx_scripts_user ON public.user_scripts (user_id);

-- ========================  UPDATED_AT TRIGGER  ==============================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'profiles', 'teams', 'calls', 'analyses',
      'practice_sessions', 'stories', 'sales_flows',
      'conversation_trees', 'mind_maps', 'user_scripts'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;

-- ========================  AUTO-CREATE PROFILE  =============================

-- Automatically create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================  ROW LEVEL SECURITY  ==============================

-- Enable RLS on all public tables
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_segments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_transcript_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_insights        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_flows          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_nodes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_trees   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_nodes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_edges           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mind_maps            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_scripts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs      ENABLE ROW LEVEL SECURITY;

-- ---- Helper: check if current user is admin ----
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- Helper: check if current user is manager of given user ----
CREATE OR REPLACE FUNCTION public.is_manager_of(target_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles AS mgr
    JOIN public.profiles AS usr ON usr.team_id = mgr.team_id
    WHERE mgr.id = auth.uid()
      AND mgr.role = 'manager'
      AND usr.id = target_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ======== PROFILES ========
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Managers can view team profiles"
  ON public.profiles FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.profiles WHERE id = auth.uid()
    )
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) IN ('manager', 'admin')
  );

-- ======== TEAMS ========
CREATE POLICY "Team members can view their team"
  ON public.teams FOR SELECT
  USING (id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins manage teams"
  ON public.teams FOR ALL
  USING (public.is_admin());

-- ======== CALLS ========
CREATE POLICY "Users manage own calls"
  ON public.calls FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Managers can view team calls"
  ON public.calls FOR SELECT
  USING (public.is_manager_of(user_id));

-- ======== TRANSCRIPT SEGMENTS ========
CREATE POLICY "Users view own call segments"
  ON public.transcript_segments FOR SELECT
  USING (
    call_id IN (SELECT id FROM public.calls WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role inserts segments"
  ON public.transcript_segments FOR INSERT
  WITH CHECK (
    call_id IN (SELECT id FROM public.calls WHERE user_id = auth.uid())
  );

-- ======== ANALYSES ========
CREATE POLICY "Users manage own analyses"
  ON public.analyses FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Managers can view team analyses"
  ON public.analyses FOR SELECT
  USING (public.is_manager_of(user_id));

-- ======== PRACTICE SESSIONS ========
CREATE POLICY "Users manage own practice sessions"
  ON public.practice_sessions FOR ALL
  USING (user_id = auth.uid());

-- ======== STORIES ========
CREATE POLICY "Users manage own stories"
  ON public.stories FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users can view template stories"
  ON public.stories FOR SELECT
  USING (is_template = true);

-- ======== LIVE SESSIONS ========
CREATE POLICY "Users manage own live sessions"
  ON public.live_sessions FOR ALL
  USING (user_id = auth.uid());

-- ======== LIVE TRANSCRIPT CHUNKS ========
CREATE POLICY "Users view own live chunks"
  ON public.live_transcript_chunks FOR ALL
  USING (
    session_id IN (SELECT id FROM public.live_sessions WHERE user_id = auth.uid())
  );

-- ======== LIVE INSIGHTS ========
CREATE POLICY "Users view own live insights"
  ON public.live_insights FOR ALL
  USING (
    session_id IN (SELECT id FROM public.live_sessions WHERE user_id = auth.uid())
  );

-- ======== SALES FLOWS ========
CREATE POLICY "Users manage own flows"
  ON public.sales_flows FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users can view public flows"
  ON public.sales_flows FOR SELECT
  USING (is_public = true);

-- ======== FLOW NODES ========
CREATE POLICY "Users manage own flow nodes"
  ON public.flow_nodes FOR ALL
  USING (
    flow_id IN (SELECT id FROM public.sales_flows WHERE user_id = auth.uid())
  );

CREATE POLICY "Users view public flow nodes"
  ON public.flow_nodes FOR SELECT
  USING (
    flow_id IN (SELECT id FROM public.sales_flows WHERE is_public = true)
  );

-- ======== CONVERSATION TREES ========
CREATE POLICY "Users manage own trees"
  ON public.conversation_trees FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users view public trees"
  ON public.conversation_trees FOR SELECT
  USING (is_public = true);

-- ======== TREE NODES ========
CREATE POLICY "Users manage own tree nodes"
  ON public.tree_nodes FOR ALL
  USING (
    tree_id IN (SELECT id FROM public.conversation_trees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users view public tree nodes"
  ON public.tree_nodes FOR SELECT
  USING (
    tree_id IN (SELECT id FROM public.conversation_trees WHERE is_public = true)
  );

-- ======== TREE EDGES ========
CREATE POLICY "Users manage own tree edges"
  ON public.tree_edges FOR ALL
  USING (
    tree_id IN (SELECT id FROM public.conversation_trees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users view public tree edges"
  ON public.tree_edges FOR SELECT
  USING (
    tree_id IN (SELECT id FROM public.conversation_trees WHERE is_public = true)
  );

-- ======== MIND MAPS ========
CREATE POLICY "Users manage own mind maps"
  ON public.mind_maps FOR ALL
  USING (user_id = auth.uid());

-- ======== USER SCRIPTS ========
CREATE POLICY "Users manage own scripts"
  ON public.user_scripts FOR ALL
  USING (user_id = auth.uid());

-- ======== PROCESSING JOBS ========
CREATE POLICY "Users view own jobs"
  ON public.processing_jobs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own jobs"
  ON public.processing_jobs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ========================  STORAGE BUCKETS  =================================

-- Audio file uploads bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'call-recordings',
  'call-recordings',
  false,
  52428800,  -- 50 MB
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/webm', 'audio/flac']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access their own folder (user_id/filename)
CREATE POLICY "Users upload own recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'call-recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users read own recordings"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'call-recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own recordings"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'call-recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ========================  DATABASE FUNCTIONS  ==============================

-- Dashboard stats for a user
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_calls', (SELECT COUNT(*) FROM public.calls WHERE user_id = target_user_id),
    'analyzed_calls', (SELECT COUNT(*) FROM public.analyses WHERE user_id = target_user_id),
    'avg_score', (SELECT ROUND(AVG(overall_score)::numeric, 1) FROM public.analyses WHERE user_id = target_user_id),
    'practice_sessions', (SELECT COUNT(*) FROM public.practice_sessions WHERE user_id = target_user_id),
    'total_call_minutes', (SELECT COALESCE(SUM(duration_secs), 0) / 60 FROM public.calls WHERE user_id = target_user_id AND status = 'completed'),
    'score_trend', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT date_trunc('week', created_at)::date AS week,
               ROUND(AVG(overall_score)::numeric, 1) AS avg_score,
               COUNT(*) AS call_count
        FROM public.analyses
        WHERE user_id = target_user_id
          AND created_at > now() - interval '12 weeks'
        GROUP BY week
        ORDER BY week
      ) t
    ),
    'category_averages', (
      SELECT json_build_object(
        'discovery', ROUND(AVG(discovery_score)::numeric, 1),
        'rapport', ROUND(AVG(rapport_score)::numeric, 1),
        'objection', ROUND(AVG(objection_score)::numeric, 1),
        'closing', ROUND(AVG(closing_score)::numeric, 1),
        'storytelling', ROUND(AVG(storytelling_score)::numeric, 1),
        'persuasion', ROUND(AVG(persuasion_score)::numeric, 1)
      )
      FROM public.analyses
      WHERE user_id = target_user_id
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ========================  GRANTS  ==========================================

-- Anon & authenticated roles get access through RLS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
