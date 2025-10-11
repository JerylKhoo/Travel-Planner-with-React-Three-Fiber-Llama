import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../Config/supabase';

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    // Check if user wants to be remembered
    const rememberMe = localStorage.getItem('rememberMe') === 'true';

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      // If remember me is false and page was reloaded, clear the session
      if (!rememberMe && session) {
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
  }, []);

  // Sign up with email and password
  const signUp = async (email, password, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/`
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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear remember me preference and temp session
      localStorage.removeItem('rememberMe');
      sessionStorage.removeItem('supabase.temp.session');

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
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
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;

      // Always remember user on Google sign in
      localStorage.setItem('rememberMe', 'true');

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const value = {
    user,
    userId,
    userEmail,
    isLoggedIn,
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
