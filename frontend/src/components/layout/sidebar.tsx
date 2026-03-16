import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Phone,
  BarChart3,
  Upload,
  Target,
  BookOpen,
  Settings,
  ChevronLeft,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { to: '/app', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/app/calls', icon: Phone, label: 'Calls' },
  { to: '/app/upload', icon: Upload, label: 'Upload' },
  { to: '/app/practice', icon: Target, label: 'Practice' },
  { to: '/app/stories', icon: BookOpen, label: 'Story Bank' },
];

const bottomItems = [
  { to: '/app/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const location = useLocation();

  const NavItem = ({ to, icon: Icon, label, end }: (typeof navItems)[0] & { end?: boolean }) => {
    const isActive = end ? location.pathname === to : location.pathname.startsWith(to);

    if (sidebarCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <NavLink
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <NavLink
        to={to}
        end={end}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span>{label}</span>
        {isActive && (
          <motion.div
            layoutId="sidebar-indicator"
            className="absolute left-0 h-6 w-1 rounded-r-full bg-primary"
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn(
        'flex items-center border-b border-border px-4 h-16 shrink-0',
        sidebarCollapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-md shadow-primary/20">
          <BarChart3 className="h-4.5 w-4.5 text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight">CloserAI</span>
            <span className="text-2xs text-muted-foreground">Sales Coach</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {navItems.map((item) => (
          <div key={item.to} className="relative">
            <NavItem {...item} />
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-3 space-y-1">
        {bottomItems.map((item) => (
          <div key={item.to} className="relative">
            <NavItem {...item} />
          </div>
        ))}

        {/* Collapse toggle - desktop only */}
        <div className="hidden lg:block">
          <button
            onClick={toggleSidebarCollapsed}
            className="flex h-10 w-full items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-border bg-card/50 transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-60'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-60 bg-card border-r border-border lg:hidden"
            >
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute right-2 top-4"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
