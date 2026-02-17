import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Custom storage that respects "Keep me logged in" preference
const customStorage = {
  getItem: (key) => {
    const keepLoggedIn = localStorage.getItem('keepLoggedIn') !== 'false';
    if (keepLoggedIn) {
      return localStorage.getItem(key);
    }
    return sessionStorage.getItem(key);
  },
  setItem: (key, value) => {
    const keepLoggedIn = localStorage.getItem('keepLoggedIn') !== 'false';
    if (keepLoggedIn) {
      localStorage.setItem(key, value);
    } else {
      sessionStorage.setItem(key, value);
    }
  },
  removeItem: (key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
  },
});
