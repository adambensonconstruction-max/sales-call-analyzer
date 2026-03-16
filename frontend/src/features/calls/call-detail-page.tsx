import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RefreshCw,
  Clock,
  FileAudio,
  MessageSquare,
  BarChart3,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScoreRing } from '@/components/shared/score-ring';
import { PageLoading } from '@/components/shared/loading-spinner';
import { useCall, useTranscript } from '@/hooks/use-calls';
import { useAnalysis, useTriggerAnalysis } from '@/hooks/use-analysis';
import { formatDuration, formatMs, formatRelativeTime, getStatusColor, cn } from '@/lib/utils';
import type { TranscriptSegment } from '@/types';

export function CallDetailPage() {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);

  const { data: call, isLoading: callLoading } = useCall(callId!);
  const { data: transcript } = useTranscript(callId!);
  const { data: analysis, isLoading: analysisLoading } = useAnalysis(callId!);
  const triggerMutation = useTriggerAnalysis();

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const seekTo = useCallback((timeMs: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = timeMs / 1000;
    setCurrentTime(timeMs / 1000);
    if (!isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const skip = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime + seconds);
  }, []);

  // Track active segment based on audio time
  useEffect(() => {
    if (!transcript) return;
    const currentMs = currentTime * 1000;
    const seg = transcript.find(
      (s) => currentMs >= s.start_ms && currentMs <= s.end_ms
    );
    setActiveSegment(seg?.id || null);
  }, [currentTime, transcript]);

  if (callLoading) return <PageLoading />;
  if (!call) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Call not found</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/calls')} className="mt-4">
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Back to calls
        </Button>
      </div>
    );
  }

  const scores = analysis
    ? [
        { label: 'Overall', score: analysis.overall_score },
        { label: 'Discovery', score: analysis.discovery_score },
        { label: 'Rapport', score: analysis.rapport_score },
        { label: 'Objection', score: analysis.objection_score },
        { label: 'Closing', score: analysis.closing_score },
        { label: 'Storytelling', score: analysis.storytelling_score },
        { label: 'Persuasion', score: analysis.persuasion_score },
      ]
    : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('/app/calls')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold truncate">{call.name || 'Untitled Call'}</h1>
            <Badge variant="outline" className={`shrink-0 ${getStatusColor(call.status)}`}>
              {call.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(call.created_at)}
            </span>
            {call.duration_secs && (
              <span className="flex items-center gap-1">
                <FileAudio className="h-3 w-3" />
                {formatDuration(call.duration_secs)}
              </span>
            )}
          </div>
        </div>

        {call.status === 'completed' && !analysis && (
          <Button
            onClick={() => triggerMutation.mutate({ callId: call.id })}
            disabled={triggerMutation.isPending}
          >
            {triggerMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4" />
            )}
            Analyze
          </Button>
        )}
        {analysis && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerMutation.mutate({ callId: call.id, force: true })}
            disabled={triggerMutation.isPending}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', triggerMutation.isPending && 'animate-spin')} />
            Re-analyze
          </Button>
        )}
      </div>

      {/* Processing status */}
      {(call.status === 'transcribing' || call.status === 'analyzing') && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {call.status === 'transcribing' ? 'Transcribing your call...' : 'AI is analyzing your call...'}
                </p>
                <p className="text-xs text-muted-foreground">This usually takes 1-3 minutes</p>
              </div>
            </div>
            <Progress value={call.status === 'transcribing' ? 40 : 70} className="mt-3" />
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {call.status === 'failed' && (
        <Card className="mb-6 border-destructive/20 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Processing failed</p>
              <p className="text-xs text-muted-foreground">{call.error_message || 'An error occurred'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audio Player */}
      {call.file_path && (
        <Card className="mb-6 glass-hover">
          <CardContent className="p-4">
            <audio
              ref={audioRef}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onDurationChange={(e) => setDuration(e.currentTarget.duration)}
              onEnded={() => setIsPlaying(false)}
            />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => skip(-10)}>
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  onClick={togglePlay}
                  className="rounded-full shadow-md shadow-primary/20"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4 ml-0.5" />
                  )}
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => skip(10)}>
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1">
                <div
                  className="relative h-2 rounded-full bg-muted cursor-pointer group"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = (e.clientX - rect.left) / rect.width;
                    if (audioRef.current) {
                      audioRef.current.currentTime = pct * duration;
                    }
                  }}
                >
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all"
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-primary shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%`, marginLeft: '-7px' }}
                  />
                </div>
              </div>

              <div className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="analysis" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analysis" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="transcript" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Transcript
          </TabsTrigger>
        </TabsList>

        {/* Analysis Tab */}
        <TabsContent value="analysis">
          {analysisLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ) : analysis ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Score Rings */}
              <Card className="glass-hover">
                <CardContent className="p-6">
                  <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
                    {scores.map((s) => (
                      <ScoreRing
                        key={s.label}
                        score={s.score}
                        label={s.label}
                        size={s.label === 'Overall' ? 100 : 72}
                        strokeWidth={s.label === 'Overall' ? 8 : 5}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Talk Ratio */}
              {analysis.talk_ratio?.seller_pct != null && (
                <Card className="glass-hover">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Talk Ratio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span>Seller ({analysis.talk_ratio.seller_pct}%)</span>
                          <span>Buyer ({analysis.talk_ratio.buyer_pct}%)</span>
                        </div>
                        <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                          <div
                            className="bg-primary rounded-l-full transition-all"
                            style={{ width: `${analysis.talk_ratio.seller_pct}%` }}
                          />
                          <div
                            className="bg-emerald-500 rounded-r-full transition-all"
                            style={{ width: `${analysis.talk_ratio.buyer_pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary */}
              {analysis.summary && (
                <Card className="glass-hover">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {analysis.summary}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Strengths */}
              {analysis.strengths?.length > 0 && (
                <Card className="glass-hover">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-emerald-500">
                      💪 Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysis.strengths.map((s, i) => (
                      <div key={i} className="flex gap-3 group">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{s.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.detail}</p>
                          {s.timestamp_ms != null && (
                            <button
                              onClick={() => seekTo(s.timestamp_ms!)}
                              className="text-2xs text-primary hover:underline mt-1 flex items-center gap-1"
                            >
                              <Play className="h-2.5 w-2.5" />
                              {formatMs(s.timestamp_ms)}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Improvements */}
              {analysis.improvements?.length > 0 && (
                <Card className="glass-hover">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-amber-500">
                      🎯 Areas to Improve
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysis.improvements.map((imp, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{imp.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{imp.detail}</p>
                          {imp.suggestion && (
                            <div className="mt-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
                              <p className="text-xs">
                                <span className="font-medium text-primary">Suggestion: </span>
                                {imp.suggestion}
                              </p>
                            </div>
                          )}
                          {imp.timestamp_ms != null && (
                            <button
                              onClick={() => seekTo(imp.timestamp_ms!)}
                              className="text-2xs text-primary hover:underline mt-1 flex items-center gap-1"
                            >
                              <Play className="h-2.5 w-2.5" />
                              {formatMs(imp.timestamp_ms)}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Objections */}
              {analysis.objections_detected?.length > 0 && (
                <Card className="glass-hover">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">🛡️ Objections Detected</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysis.objections_detected.map((obj, i) => (
                      <div key={i} className="rounded-lg bg-muted/50 p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">"{obj.text}"</p>
                          <button
                            onClick={() => seekTo(obj.timestamp_ms)}
                            className="text-2xs text-primary hover:underline shrink-0 flex items-center gap-1"
                          >
                            <Play className="h-2.5 w-2.5" />
                            {formatMs(obj.timestamp_ms)}
                          </button>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs">
                            <span className="text-muted-foreground">Your handling: </span>
                            {obj.handling}
                          </p>
                          <div className="rounded-md bg-primary/5 border border-primary/10 px-3 py-2">
                            <p className="text-xs">
                              <span className="font-medium text-primary">Better response: </span>
                              {obj.better_response}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </motion.div>
          ) : call.status === 'completed' ? (
            <Card className="glass-hover">
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">No analysis yet</p>
                <p className="text-xs text-muted-foreground mb-4">Run AI analysis to get insights</p>
                <Button
                  onClick={() => triggerMutation.mutate({ callId: call.id })}
                  disabled={triggerMutation.isPending}
                >
                  {triggerMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <BarChart3 className="h-4 w-4" />
                  )}
                  Analyze Call
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {/* Transcript Tab */}
        <TabsContent value="transcript">
          {!transcript?.length ? (
            <Card className="glass-hover">
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {call.status === 'transcribing'
                    ? 'Transcript is being generated...'
                    : 'No transcript available'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-hover">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {transcript.map((segment) => (
                    <TranscriptRow
                      key={segment.id}
                      segment={segment}
                      isActive={segment.id === activeSegment}
                      onSeek={seekTo}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function TranscriptRow({
  segment,
  isActive,
  onSeek,
}: {
  segment: TranscriptSegment;
  isActive: boolean;
  onSeek: (ms: number) => void;
}) {
  const isSeller = segment.speaker_role === 'seller';

  return (
    <button
      onClick={() => onSeek(segment.start_ms)}
      className={cn(
        'flex gap-3 px-4 py-3 w-full text-left transition-colors hover:bg-accent/50',
        isActive && 'bg-primary/5 border-l-2 border-l-primary'
      )}
    >
      <div className="shrink-0 mt-0.5">
        <div
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full text-2xs font-bold',
            isSeller
              ? 'bg-primary/10 text-primary'
              : 'bg-emerald-500/10 text-emerald-500'
          )}
        >
          {isSeller ? 'S' : segment.speaker_role === 'buyer' ? 'B' : '?'}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
            {segment.speaker_role === 'unknown' ? segment.speaker_label : segment.speaker_role}
          </span>
          <span className="text-2xs text-muted-foreground/60">
            {formatMs(segment.start_ms)}
          </span>
        </div>
        <p className="text-sm leading-relaxed">{segment.text}</p>
      </div>
    </button>
  );
}
