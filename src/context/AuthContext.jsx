import { createContext, useState, useEffect } from 'react';
import { supabase, supabaseUrl } from '../lib/supabase';

const supabaseStorageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user wants to stay logged in
    const keepLoggedIn = localStorage.getItem('keepLoggedIn');
    const wasLoggedIn = sessionStorage.getItem('wasLoggedIn');

    // If keepLoggedIn is false and this is a new session (page refresh), sign out
    if (keepLoggedIn === 'false' && !wasLoggedIn) {
      supabase.auth.signOut();
      setLoading(false);
      return;
    }

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          // Clear corrupted session data
          localStorage.removeItem(supabaseStorageKey);
          sessionStorage.clear();
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          if (session) {
            sessionStorage.setItem('wasLoggedIn', 'true');
          }
        }
        setLoading(false);
      })
      .catch(() => {
        // Clear all auth data on error
        localStorage.removeItem(supabaseStorageKey);
        sessionStorage.clear();
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session) {
          sessionStorage.setItem('wasLoggedIn', 'true');
        } else {
          sessionStorage.removeItem('wasLoggedIn');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password, redirectTo) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${redirectTo || '/'}`,
      },
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async (redirectTo) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${redirectTo || '/'}`,
      }
    });
    if (error) throw error;
    return data;
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const signInAsGuest = async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
    }
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut().catch(() => {});
    setSession(null);
    setUser(null);
  };

  const updateAvatar = async (emoji, color) => {
    const { data, error } = await supabase.auth.updateUser({
      data: { avatar_emoji: emoji, avatar_color: color },
    });
    if (error) throw error;
    setUser(data.user);
    return data.user;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isGuest: user?.is_anonymous === true, signUp, signIn, signInWithGoogle, signInAsGuest, signOut, resetPassword, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}
