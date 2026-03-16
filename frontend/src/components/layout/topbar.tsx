import { Menu, Moon, Sun, Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUIStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export function Topbar() {
  const { toggleSidebar, theme, toggleTheme } = useUIStore();
  const { profile } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : profile?.email?.[0]?.toUpperCase() || '?';

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card/50 backdrop-blur-xl px-4 lg:px-6">
      {/* Left */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search */}
        <div className="hidden sm:flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground w-64 cursor-pointer hover:bg-muted transition-colors">
          <Search className="h-4 w-4" />
          <span>Search calls...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 text-2xs text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'dark' ? (
            <Sun className="h-4.5 w-4.5" />
          ) : (
            <Moon className="h-4.5 w-4.5" />
          )}
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/app/settings')}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
