import { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
          console.error('Session error:', error);
          // Clear corrupted session data
          localStorage.removeItem('sb-rdplazpitzyfpdznfktb-auth-token');
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
      .catch((err) => {
        console.error('Failed to get session:', err);
        // Clear all auth data on error
        localStorage.removeItem('sb-rdplazpitzyfpdznfktb-auth-token');
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

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      }
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
