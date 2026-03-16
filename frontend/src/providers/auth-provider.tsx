import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { PageLoading } from '@/components/shared/loading-spinner';

const PUBLIC_ROUTES = ['/', '/login', '/signup'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setProfile, setLoading, isLoading, session } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        // Fetch profile
        supabase
          .from('profiles')
          .select('*')
          .eq('id', s.user.id)
          .single()
          .then(({ data }) => {
            setProfile(data);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', s.user.id)
          .single()
          .then(({ data }) => setProfile(data));
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setProfile, setLoading]);

  // Redirect logic
  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname);

    if (!session && !isPublicRoute) {
      navigate('/login', { replace: true });
    } else if (session && (location.pathname === '/login' || location.pathname === '/signup')) {
      navigate('/app', { replace: true });
    }
  }, [session, isLoading, location.pathname, navigate]);

  if (isLoading) {
    return (
      <div className="h-screen">
        <PageLoading />
      </div>
    );
  }

  return <>{children}</>;
}
