import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Phone,
  Upload,
  Search,
  ArrowRight,
  Trash2,
  MoreHorizontal,
  Clock,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useCalls, useDeleteCall } from '@/hooks/use-calls';
import { formatDuration, formatRelativeTime, getStatusColor, formatFileSize } from '@/lib/utils';
import type { CallStatus } from '@/types';

const STATUS_FILTERS: { label: string; value: CallStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Completed', value: 'completed' },
  { label: 'Analyzing', value: 'analyzing' },
  { label: 'Transcribing', value: 'transcribing' },
  { label: 'Failed', value: 'failed' },
];

export function CallsListPage() {
  const [statusFilter, setStatusFilter] = useState<CallStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const { data: calls, isLoading } = useCalls({
    limit: 50,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const deleteMutation = useDeleteCall();

  const filteredCalls = calls?.filter((call) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      call.name?.toLowerCase().includes(q) ||
      call.id.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="Calls"
        description="All your sales call recordings"
        actions={
          <Button onClick={() => navigate('/app/upload')}>
            <Upload className="h-4 w-4" />
            Upload Call
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search calls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
              className="shrink-0"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Calls List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : !filteredCalls?.length ? (
        <EmptyState
          icon={Phone}
          title={searchQuery ? 'No calls found' : 'No calls yet'}
          description={
            searchQuery
              ? 'Try adjusting your search'
              : 'Upload your first sales call to get started'
          }
          action={
            !searchQuery
              ? { label: 'Upload Call', onClick: () => navigate('/app/upload') }
              : undefined
          }
        />
      ) : (
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {filteredCalls.map((call, index) => (
            <motion.div
              key={call.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card className="glass-hover group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted shrink-0 group-hover:bg-primary/10 transition-colors">
                      {call.status === 'completed' ? (
                        <BarChart3 className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      ) : (
                        <Phone className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Info */}
                    <button
                      onClick={() => navigate(`/app/calls/${call.id}`)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium truncate">
                          {call.name || 'Untitled Call'}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-2xs shrink-0 ${getStatusColor(call.status)}`}
                        >
                          {call.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(call.created_at)}
                        </span>
                        {call.duration_secs && (
                          <span>{formatDuration(call.duration_secs)}</span>
                        )}
                        {call.file_size_bytes && (
                          <span className="hidden sm:inline">{formatFileSize(call.file_size_bytes)}</span>
                        )}
                      </div>
                    </button>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/app/calls/${call.id}`)}
                        className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        View
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/app/calls/${call.id}`)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              if (confirm('Delete this call?')) {
                                deleteMutation.mutate(call.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
