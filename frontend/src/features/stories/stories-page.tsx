import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Edit3,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ScoreRing } from '@/components/shared/score-ring';
import { useStories, useCreateStory, useDeleteStory } from '@/hooks/use-stories';
import type { StoryCategory } from '@/types';

const CATEGORIES: { value: StoryCategory | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: '' },
  { value: 'success', label: 'Success', color: 'text-emerald-500 bg-emerald-500/10' },
  { value: 'objection_overcome', label: 'Objection', color: 'text-red-500 bg-red-500/10' },
  { value: 'rapport_building', label: 'Rapport', color: 'text-blue-500 bg-blue-500/10' },
  { value: 'closing', label: 'Closing', color: 'text-amber-500 bg-amber-500/10' },
  { value: 'discovery', label: 'Discovery', color: 'text-violet-500 bg-violet-500/10' },
  { value: 'pain_point', label: 'Pain Point', color: 'text-orange-500 bg-orange-500/10' },
];

export function StoriesPage() {
  const [categoryFilter, setCategoryFilter] = useState<StoryCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<StoryCategory>('success');

  const { data: stories, isLoading } = useStories(
    categoryFilter === 'all' ? undefined : { category: categoryFilter }
  );
  const createMutation = useCreateStory();
  const deleteMutation = useDeleteStory();

  const filteredStories = stories?.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.content.toLowerCase().includes(q)
    );
  });

  const handleCreate = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    createMutation.mutate(
      { title: newTitle, content: newContent, category: newCategory },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewTitle('');
          setNewContent('');
        },
      }
    );
  };

  return (
    <div>
      <PageHeader
        title="Story Bank"
        description="Your collection of powerful sales stories"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Add Story
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              variant={categoryFilter === cat.value ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setCategoryFilter(cat.value)}
              className="shrink-0"
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stories Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : !filteredStories?.length ? (
        <EmptyState
          icon={BookOpen}
          title={searchQuery ? 'No stories found' : 'No stories yet'}
          description={
            searchQuery
              ? 'Try adjusting your search'
              : 'Start building your library of powerful sales stories'
          }
          action={
            !searchQuery
              ? { label: 'Add Your First Story', onClick: () => setShowCreate(true) }
              : undefined
          }
        />
      ) : (
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {filteredStories.map((story, i) => {
            const catInfo = CATEGORIES.find((c) => c.value === story.category);
            return (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="glass-hover group h-full flex flex-col">
                  <CardContent className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <Badge variant="outline" className={`text-2xs ${catInfo?.color || ''}`}>
                        {catInfo?.label || story.category}
                      </Badge>
                      {story.effectiveness != null && (
                        <ScoreRing
                          score={story.effectiveness}
                          size={32}
                          strokeWidth={2.5}
                          showLabel={false}
                          animated={false}
                        />
                      )}
                    </div>
                    <h3 className="text-sm font-semibold mb-2 line-clamp-2">{story.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4 flex-1">
                      {story.content}
                    </p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <div className="flex gap-1 flex-wrap">
                        {story.tags?.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-2xs text-muted-foreground bg-muted rounded px-1.5 py-0.5"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon-sm">
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            if (confirm('Delete this story?')) {
                              deleteMutation.mutate(story.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Create Story Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Story</DialogTitle>
            <DialogDescription>
              Add a sales story to your bank for quick reference
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="e.g., The Johnson Kitchen Transformation"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.filter((c) => c.value !== 'all').map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setNewCategory(cat.value as StoryCategory)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium border transition-all ${
                      newCategory === cat.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Story</label>
              <textarea
                className="flex min-h-[120px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                placeholder="Tell the story in your own words..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newTitle.trim() || !newContent.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add Story
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
