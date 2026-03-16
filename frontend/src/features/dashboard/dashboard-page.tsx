import { motion } from 'framer-motion';
import {
  Phone,
  TrendingUp,
  Clock,
  Target,
  Upload,
  ArrowRight,
  BarChart3,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useDashboardStats } from '@/hooks/use-dashboard';
import { useCalls } from '@/hooks/use-calls';
import { useAuthStore } from '@/stores/auth';
import { formatDuration, formatRelativeTime, getStatusColor } from '@/lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export function DashboardPage() {
  const { profile } = useAuthStore();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentCalls, isLoading: callsLoading } = useCalls({ limit: 5 });
  const navigate = useNavigate();

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  const statCards = [
    {
      label: 'Total Calls',
      value: stats?.total_calls ?? 0,
      icon: Phone,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Avg Score',
      value: stats?.avg_score ?? '—',
      icon: TrendingUp,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      suffix: stats?.avg_score ? '/100' : '',
    },
    {
      label: 'Call Minutes',
      value: stats?.total_call_minutes ?? 0,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      suffix: 'min',
    },
    {
      label: 'Practice Sessions',
      value: stats?.practice_sessions ?? 0,
      icon: Target,
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10',
    },
  ];

  // Radar chart data from category averages
  const radarData = stats?.category_averages
    ? [
        { subject: 'Discovery', score: stats.category_averages.discovery ?? 0 },
        { subject: 'Rapport', score: stats.category_averages.rapport ?? 0 },
        { subject: 'Objection', score: stats.category_averages.objection ?? 0 },
        { subject: 'Closing', score: stats.category_averages.closing ?? 0 },
        { subject: 'Storytelling', score: stats.category_averages.storytelling ?? 0 },
        { subject: 'Persuasion', score: stats.category_averages.persuasion ?? 0 },
      ]
    : [];

  const hasData = (stats?.total_calls ?? 0) > 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's how your sales game is looking"
        actions={
          <Button onClick={() => navigate('/app/upload')}>
            <Upload className="h-4 w-4" />
            Upload Call
          </Button>
        }
      />

      {/* Stat Cards */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.label} className="glass-hover group cursor-default">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
                </div>
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-20 mb-1" />
              ) : (
                <div className="text-2xl font-bold tabular-nums">
                  {stat.value}
                  {stat.suffix && (
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      {stat.suffix}
                    </span>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {!hasData && !statsLoading ? (
        <motion.div variants={item}>
          <EmptyState
            icon={BarChart3}
            title="No calls yet"
            description="Upload your first sales call to start getting AI-powered insights and coaching"
            action={{
              label: 'Upload Your First Call',
              onClick: () => navigate('/app/upload'),
            }}
          />
        </motion.div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Score Trend Chart */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="glass-hover">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Score Trend</CardTitle>
                  <Badge variant="secondary" className="text-2xs">Last 12 weeks</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-[240px] w-full" />
                ) : stats?.score_trend?.length ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={stats.score_trend}>
                      <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                        tickFormatter={(val) => {
                          const d = new Date(val);
                          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(240, 6%, 6%)',
                          border: '1px solid hsl(240, 4%, 16%)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="avg_score"
                        stroke="hsl(239, 84%, 67%)"
                        strokeWidth={2}
                        fill="url(#scoreGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                    Complete a few calls to see your trend
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Skill Radar */}
          <motion.div variants={item}>
            <Card className="glass-hover h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Skills Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-[240px] w-full" />
                ) : radarData.length && radarData.some((d) => d.score > 0) ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid className="stroke-border" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fontSize: 10 }}
                        className="text-muted-foreground"
                      />
                      <Radar
                        dataKey="score"
                        stroke="hsl(239, 84%, 67%)"
                        fill="hsl(239, 84%, 67%)"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                    Complete your first analysis to see skills
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Calls */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="glass-hover">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Recent Calls</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/app/calls')}
                    className="text-xs"
                  >
                    View all
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {callsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : recentCalls?.length ? (
                  <div className="space-y-2">
                    {recentCalls.map((call) => (
                      <button
                        key={call.id}
                        onClick={() => navigate(`/app/calls/${call.id}`)}
                        className="flex items-center gap-4 w-full rounded-lg p-3 text-left hover:bg-accent transition-colors group"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
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
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span>{formatRelativeTime(call.created_at)}</span>
                            {call.duration_secs && (
                              <span>{formatDuration(call.duration_secs)}</span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No calls yet. Upload your first one!
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={item}>
            <Card className="glass-hover h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  {
                    icon: Upload,
                    label: 'Upload a Call',
                    desc: 'Analyze a new recording',
                    to: '/app/upload',
                    color: 'text-primary bg-primary/10',
                  },
                  {
                    icon: Target,
                    label: 'Start Practice',
                    desc: 'Roleplay with AI',
                    to: '/app/practice',
                    color: 'text-violet-500 bg-violet-500/10',
                  },
                  {
                    icon: Zap,
                    label: 'View Insights',
                    desc: 'See your latest analysis',
                    to: '/app/calls',
                    color: 'text-amber-500 bg-amber-500/10',
                  },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={() => navigate(action.to)}
                    className="flex items-center gap-3 w-full rounded-lg p-3 text-left hover:bg-accent transition-colors group"
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${action.color} shrink-0`}>
                      <action.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{action.label}</div>
                      <div className="text-xs text-muted-foreground">{action.desc}</div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
