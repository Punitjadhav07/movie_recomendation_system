import { createClient } from '@supabase/supabase-js';

// Default / Cached environment credentials
const savedUrl = localStorage.getItem('cinematch_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
const savedKey = localStorage.getItem('cinematch_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance = null;

if (savedUrl && savedKey) {
  try {
    supabaseInstance = createClient(savedUrl, savedKey);
  } catch (err) {
    console.warn('Could not initialize Supabase client:', err.message);
  }
}

export function getSupabase() {
  return supabaseInstance;
}

export function isSupabaseConnected() {
  return !!supabaseInstance;
}

export function setSupabaseConfig(url, key) {
  if (!url || !key) {
    supabaseInstance = null;
    localStorage.removeItem('cinematch_supabase_url');
    localStorage.removeItem('cinematch_supabase_key');
    return false;
  }

  try {
    supabaseInstance = createClient(url, key);
    localStorage.setItem('cinematch_supabase_url', url);
    localStorage.setItem('cinematch_supabase_key', key);
    return true;
  } catch (err) {
    console.error('Failed to configure Supabase client:', err);
    return false;
  }
}

export const SUPABASE_SQL_SCHEMA = `-- CineMatch Supabase Schema Setup

-- 1. Movies Table
CREATE TABLE IF NOT EXISTS public.movies (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  year INT NOT NULL,
  genres TEXT[] NOT NULL,
  rating NUMERIC(3, 1) DEFAULT 4.0,
  vote_count INT DEFAULT 0,
  runtime TEXT,
  director TEXT,
  cast_members TEXT[],
  overview TEXT,
  poster TEXT,
  backdrop TEXT,
  tagline TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ratings Table
CREATE TABLE IF NOT EXISTS public.ratings (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  movie_id BIGINT REFERENCES public.movies(id) ON DELETE CASCADE,
  rating NUMERIC(2, 1) CHECK (rating >= 0.5 AND rating <= 5.0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, movie_id)
);

-- 3. User Profiles & Preferences
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id TEXT PRIMARY KEY,
  archetype TEXT,
  favorite_genres TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) policies can be enabled as desired
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view movies" ON public.movies FOR SELECT USING (true);
`;
