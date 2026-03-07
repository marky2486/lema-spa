import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId) => {
    if (!userId) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching role:', error);
        return null;
      }
      return data?.role;
    } catch (err) {
      console.error('Unexpected error fetching role:', err);
      return null;
    }
  };

  const handleSession = useCallback(async (currentSession) => {
    // If no session, clear everything and return
    if (!currentSession) {
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
    }

    setSession(currentSession);
    const currentUser = currentSession.user;
    setUser(currentUser);
    
    if (currentUser) {
        const userRole = await fetchUserRole(currentUser.id);
        setRole(userRole);
    } else {
        setRole(null);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          // Handle refresh token errors specifically by clearing the invalid session
          if (
            error.message.includes('Refresh Token Not Found') || 
            error.message.includes('Invalid Refresh Token') ||
            (error.code === 'refresh_token_not_found')
          ) {
             console.warn("Refresh token invalid, clearing session");
             // Force sign out to clear invalid tokens from local storage
             await supabase.auth.signOut();
             if (mounted) {
                setSession(null);
                setUser(null);
                setRole(null);
                setLoading(false);
             }
             return;
          }
          throw error; // Re-throw other errors to the catch block
        }

        if (mounted) handleSession(session);
      } catch (error) {
        console.error('Auth session initialization error:', error);
        // Ensure we don't hang on loading state even if error occurs
        if (mounted) {
            setSession(null);
            setUser(null);
            setRole(null);
            setLoading(false);
        }
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'TOKEN_REFRESH_REVOKED' || event === 'SIGNED_OUT') {
            if (mounted) {
                setSession(null);
                setUser(null);
                setRole(null);
                setLoading(false);
            }
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (mounted) handleSession(session);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleSession]);

  const signUp = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { data, error };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { data, error };
  }, [toast]);

  const signOut = useCallback(async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    } catch (error) {
         console.error("Sign out error", error);
    } finally {
        // Always clear local state to ensure UI updates
        setSession(null);
        setUser(null);
        setRole(null);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    role,
    loading,
    signUp,
    signIn,
    signOut,
  }), [user, session, role, loading, signUp, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};