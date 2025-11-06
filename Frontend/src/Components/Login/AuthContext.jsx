import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../Config/supabase';
import { useStore } from '../../Store/useStore';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get Zustand setters
  const setUserId = useStore.getState().setUserId;
  const setUserEmail = useStore.getState().setUserEmail;
  const setIsLoggedIn = useStore.getState().setIsLoggedIn;

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const isRecovery = hashParams.get('type') === 'recovery';
    const rememberMe = localStorage.getItem('rememberMe') === 'true';

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!rememberMe && session && !isRecovery) {
        supabase.auth.signOut();
        localStorage.removeItem('rememberMe');
        sessionStorage.removeItem('supabase.temp.session');
        setUser(null);
        setIsLoggedIn(false);
        setUserId(null);
        setUserEmail(null);
      } else {
        setUser(session?.user ?? null);
        setIsLoggedIn(!!session?.user);
        setUserId(session?.user?.id ?? null);
        setUserEmail(session?.user?.email ?? null);
      }
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoggedIn(!!session?.user);
      setUserId(session?.user?.id ?? null);
      setUserEmail(session?.user?.email ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setUserId, setUserEmail, setIsLoggedIn]);

  // Sign up with email and password
  const signUp = async (email, password, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `https://jet3holiday.vercel.app/`
        }
      });
      if (error) throw error;

      // Always remember user on sign up
      localStorage.setItem('rememberMe', 'true');

      // Log for debugging
      console.log('Sign up response:', data);

      return { data, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error };
    }
  };

  // Sign in with email and password
  const signIn = async (email, password, rememberMe = true) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;

      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.setItem('rememberMe', 'false');
        // Copy session to sessionStorage for non-persistent session
        const session = data.session;
        if (session) {
          sessionStorage.setItem('supabase.temp.session', JSON.stringify(session));
        }
      }

      // Log for debugging
      console.log('Sign in response:', data);

      return { data, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      // Clear local data first
      localStorage.removeItem('rememberMe');
      sessionStorage.removeItem('supabase.temp.session');

      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Manually update state to ensure UI updates immediately
      setUser(null);
      setIsLoggedIn(false);
      setUserId(null);
      setUserEmail(null);

      console.log('Successfully signed out');
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://jet3holiday.vercel.app/`,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Update password
  const updatePassword = async (newPassword) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Sign in with Google OAuth
  const signInWithGoogle = async () => {
    try {
      // Set rememberMe BEFORE initiating OAuth flow
      // This ensures it persists when user returns from Google
      localStorage.setItem('rememberMe', 'true');

      // Determine the correct redirect URL based on environment
      // In production, use window.location.origin
      // In development, ensure it's the frontend URL (not backend)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://jet3holiday.vercel.app/',
          skipBrowserRedirect: false
        }
      });
      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Google sign-in error:', error);
      return { data: null, error };
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    signInWithGoogle
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
