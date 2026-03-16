import { useState } from 'react';

import { motion } from 'framer-motion';
import {
  Target,
  MessageSquare,
  Search,
  Shield,
  Handshake,
  BookOpen,
  Zap,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ScoreRing } from '@/components/shared/score-ring';
import { usePracticeSessions, useCreatePracticeSession } from '@/hooks/use-practice';
import { formatRelativeTime, formatDuration } from '@/lib/utils';
import type { PracticeType, PracticeDifficulty } from '@/types';

const PRACTICE_TYPES = [
  {
    type: 'roleplay' as PracticeType,
    icon: MessageSquare,
    title: 'Full Roleplay',
    description: 'Complete sales call simulation with an AI homeowner',
    color: 'text-primary bg-primary/10',
  },
  {
    type: 'objection_handling' as PracticeType,
    icon: Shield,
    title: 'Objection Handling',
    description: 'Practice overcoming common objections like price, timing, and competitors',
    color: 'text-red-500 bg-red-500/10',
  },
  {
    type: 'discovery' as PracticeType,
    icon: Search,
    title: 'Discovery Questions',
    description: 'Master the art of uncovering pain points and needs',
    color: 'text-amber-500 bg-amber-500/10',
  },
  {
    type: 'closing' as PracticeType,
    icon: Handshake,
    title: 'Closing Techniques',
    description: 'Practice different closing strategies and trial closes',
    color: 'text-emerald-500 bg-emerald-500/10',
  },
  {
    type: 'storytelling' as PracticeType,
    icon: BookOpen,
    title: 'Storytelling',
    description: 'Weave compelling stories about past projects and satisfied customers',
    color: 'text-violet-500 bg-violet-500/10',
  },
];

const DIFFICULTIES: { value: PracticeDifficulty; label: string; desc: string }[] = [
  { value: 'beginner', label: 'Easy', desc: 'Friendly homeowner' },
  { value: 'intermediate', label: 'Medium', desc: 'Skeptical homeowner' },
  { value: 'advanced', label: 'Hard', desc: 'Hostile & price-focused' },
];

export function PracticePage() {
  const [selectedType, setSelectedType] = useState<PracticeType | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<PracticeDifficulty>('intermediate');

  const { data: sessions, isLoading } = usePracticeSessions({ limit: 10 });
  const createSession = useCreatePracticeSession();

  const handleStart = async () => {
    if (!selectedType) return;
    // For now just show the selection
    createSession.mutate({
      type: selectedType,
      difficulty: selectedDifficulty,
    });
  };

  return (
    <div>
      <PageHeader
        title="Practice"
        description="Sharpen your skills with AI-powered roleplay"
      />

      {/* Practice Type Selection */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {PRACTICE_TYPES.map((pt) => (
          <motion.div
            key={pt.type}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className={`glass-hover cursor-pointer transition-all ${
                selectedType === pt.type
                  ? 'ring-2 ring-primary border-primary/50'
                  : ''
              }`}
              onClick={() => setSelectedType(pt.type)}
            >
              <CardContent className="p-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${pt.color} mb-3`}>
                  <pt.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold mb-1">{pt.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{pt.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Difficulty + Start */}
      {selectedType && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="glass-hover">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold mb-4">Select Difficulty</h3>
              <div className="flex gap-3 mb-6">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setSelectedDifficulty(d.value)}
                    className={`flex-1 rounded-lg border p-3 text-center transition-all ${
                      selectedDifficulty === d.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="text-sm font-medium">{d.label}</div>
                    <div className="text-2xs text-muted-foreground">{d.desc}</div>
                  </button>
                ))}
              </div>
              <Button
                onClick={handleStart}
                variant="glow"
                size="lg"
                className="w-full"
                disabled={createSession.isPending}
              >
                <Zap className="h-4 w-4" />
                Start Practice Session
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recent Sessions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Sessions</h2>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : !sessions?.length ? (
          <EmptyState
            icon={Target}
            title="No practice sessions yet"
            description="Select a practice type above to start your first session"
          />
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => {
              const typeInfo = PRACTICE_TYPES.find((t) => t.type === session.type);
              return (
                <Card key={session.id} className="glass-hover">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${typeInfo?.color || 'bg-muted'}`}>
                        {typeInfo ? <typeInfo.icon className="h-4.5 w-4.5" /> : <Target className="h-4.5 w-4.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{typeInfo?.title || session.type}</span>
                          <Badge variant={session.completed ? 'success' : 'secondary'} className="text-2xs">
                            {session.completed ? 'Completed' : 'In Progress'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="capitalize">{session.difficulty}</span>
                          <span>{formatRelativeTime(session.created_at)}</span>
                          {session.duration_secs && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(session.duration_secs)}
                            </span>
                          )}
                        </div>
                      </div>
                      {session.score != null && (
                        <ScoreRing score={session.score} size={44} strokeWidth={3} showLabel={false} />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
