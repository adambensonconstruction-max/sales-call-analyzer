import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Upload,
  Brain,
  Target,
  BookOpen,
  Zap,
  Shield,
  ArrowRight,
  CheckCircle,
  Star,
  Play,
  Mic,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-md shadow-primary/20">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg">CloserAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">
                Get Started
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 dot-pattern opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="mb-6 px-3 py-1">
              <Zap className="h-3 w-3 mr-1.5 text-primary" />
              AI-Powered Sales Coaching for Home Improvement
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-6"
          >
            Turn every sales call into a{' '}
            <span className="gradient-text">closing opportunity</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 text-balance"
          >
            Upload your sales call recordings and get AI-driven analysis on your discovery,
            rapport building, objection handling, and closing techniques. Built specifically
            for first-visit home improvement sales.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button size="xl" variant="glow" asChild>
              <Link to="/signup">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="xl" variant="outline" asChild>
              <Link to="/login">
                <Play className="h-4 w-4" />
                Watch Demo
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 border-y border-border/50 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { value: '500+', label: 'Sales Reps' },
              { value: '47%', label: 'Close Rate Increase' },
              { value: '12K+', label: 'Calls Analyzed' },
              { value: '4.9/5', label: 'User Rating' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl sm:text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3">
              How it works
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-md mx-auto">
              Three simple steps to transform your sales performance
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                step: '01',
                icon: Upload,
                title: 'Upload Your Call',
                desc: 'Drop in any audio recording from a sales call. We support MP3, WAV, M4A, and more.',
              },
              {
                step: '02',
                icon: Brain,
                title: 'AI Analyzes Everything',
                desc: 'Our AI transcribes, identifies speakers, and evaluates every aspect of your pitch.',
              },
              {
                step: '03',
                icon: TrendingUp,
                title: 'Get Actionable Insights',
                desc: 'Receive detailed scores, specific improvement suggestions, and timestamp-linked feedback.',
              },
            ].map((item, i) => (
              <motion.div key={item.step} variants={fadeUp} custom={i + 2}>
                <Card className="glass-hover h-full text-center">
                  <CardContent className="pt-8 pb-6 px-6">
                    <div className="text-4xl font-extrabold text-primary/20 mb-4">{item.step}</div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mx-auto mb-4">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3">
              Everything you need to dominate
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-lg mx-auto">
              A complete toolkit designed for home improvement sales professionals
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {[
              {
                icon: Mic,
                title: 'Call Analysis',
                desc: 'AI-powered breakdown of every aspect of your sales pitch',
                color: 'text-primary bg-primary/10',
              },
              {
                icon: Target,
                title: 'Practice Mode',
                desc: 'Roleplay with AI homeowners at different difficulty levels',
                color: 'text-violet-500 bg-violet-500/10',
              },
              {
                icon: BookOpen,
                title: 'Story Bank',
                desc: 'Build and organize your most powerful sales stories',
                color: 'text-amber-500 bg-amber-500/10',
              },
              {
                icon: BarChart3,
                title: 'Score Tracking',
                desc: 'Track 7 key metrics over time and see your improvement',
                color: 'text-emerald-500 bg-emerald-500/10',
              },
              {
                icon: Shield,
                title: 'Objection Library',
                desc: 'AI-suggested responses to every objection you encounter',
                color: 'text-red-500 bg-red-500/10',
              },
              {
                icon: Users,
                title: 'Team Insights',
                desc: 'Managers can track team performance and share best practices',
                color: 'text-blue-500 bg-blue-500/10',
              },
            ].map((feature, i) => (
              <motion.div key={feature.title} variants={fadeUp} custom={i}>
                <Card className="glass-hover h-full">
                  <CardContent className="p-5">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${feature.color} mb-3`}>
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-semibold mb-1">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={fadeUp} custom={0} className="flex items-center justify-center gap-1 mb-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 text-amber-400 fill-amber-400" />
              ))}
            </motion.div>
            <motion.blockquote variants={fadeUp} custom={1} className="text-xl sm:text-2xl font-medium leading-relaxed mb-6">
              "CloserAI completely changed my game. My close rate went from 28% to 41% in just two months.
              The AI feedback is like having a world-class sales coach watching every call."
            </motion.blockquote>
            <motion.div variants={fadeUp} custom={2}>
              <p className="font-semibold">Mike Richardson</p>
              <p className="text-sm text-muted-foreground">Top Producer, Elite Roofing Solutions</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <Card className="gradient-border glow">
            <CardContent className="p-8 sm:p-12 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                Ready to close more deals?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Join hundreds of home improvement sales professionals who are already using AI to sharpen their skills.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="xl" variant="glow" asChild>
                  <Link to="/signup">
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="flex items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-500" /> No credit card required</span>
                <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-500" /> 14-day free trial</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
              <BarChart3 className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold">CloserAI</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 CloserAI. Built for closers.
          </p>
        </div>
      </footer>
    </div>
  );
}
