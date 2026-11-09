import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  vorname: string;
  nachname: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, vorname: string, nachname: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let authRequest = 0;

    const hydrateSession = async (session: Session | null) => {
      const currentRequest = ++authRequest;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setLoading(true);
        const [nextProfile, nextIsAdmin] = await Promise.all([
          fetchProfile(session.user.id),
          checkAdminRole(session.user.id),
        ]);
        if (alive && currentRequest === authRequest) {
          setProfile(nextProfile);
          setIsAdmin(nextIsAdmin);
          setLoading(false);
        }
      } else if (alive && currentRequest === authRequest) {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer database requests outside the auth callback to avoid lock contention.
      window.setTimeout(() => { void hydrateSession(session); }, 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      void hydrateSession(session);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    return !error && data ? data as Profile : null;
  };

  const refreshProfile = async () => {
    if (!user) return;
    setProfile(await fetchProfile(user.id));
  };

  const checkAdminRole = async (userId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();
    
    return !error && Boolean(data);
  };

  const signUp = async (email: string, password: string, vorname: string, nachname: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          vorname,
          nachname,
        },
      },
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isAdmin,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
