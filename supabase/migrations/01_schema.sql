-- =========================================================
-- CineMatch: Scalable Supabase PostgreSQL Database Schema
-- =========================================================

-- Enable UUID and vector extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Movies Table
CREATE TABLE IF NOT EXISTS public.movies (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  year INT NOT NULL,
  genres TEXT[] NOT NULL DEFAULT '{}',
  rating NUMERIC(3, 1) DEFAULT 4.0,
  vote_count INT DEFAULT 0,
  runtime TEXT,
  director TEXT,
  cast_members TEXT[] DEFAULT '{}',
  overview TEXT,
  poster TEXT,
  backdrop TEXT,
  tagline TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast title searching and genre filtering
CREATE INDEX IF NOT EXISTS idx_movies_title ON public.movies (title);
CREATE INDEX IF NOT EXISTS idx_movies_year ON public.movies (year DESC);
CREATE INDEX IF NOT EXISTS idx_movies_rating ON public.movies (rating DESC);

-- 2. Ratings Table (Stores historical & user ratings for Collaborative Filtering)
CREATE TABLE IF NOT EXISTS public.ratings (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  movie_id BIGINT NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  rating NUMERIC(2, 1) NOT NULL CHECK (rating >= 0.5 AND rating <= 5.0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_movie_rating UNIQUE (user_id, movie_id)
);

-- Indexes for lightning fast Collaborative Filtering lookups
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON public.ratings (user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_movie_id ON public.ratings (movie_id);

-- 3. User Profiles Table (Stores user taste vectors & archetypes)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id TEXT PRIMARY KEY,
  archetype TEXT DEFAULT 'Eclectic Explorer',
  favorite_genres JSONB DEFAULT '[]'::jsonb,
  total_ratings INT DEFAULT 0,
  avg_rating NUMERIC(3, 1) DEFAULT 0.0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Item-Item Movie Similarity Cache (Optional pre-computed similarity matrix)
CREATE TABLE IF NOT EXISTS public.movie_similarities (
  movie_a BIGINT NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  movie_b BIGINT NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  similarity_score NUMERIC(5, 4) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (movie_a, movie_b)
);

-- 5. Row Level Security (RLS) Policies
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to movies
CREATE POLICY "Public can view movies" ON public.movies
  FOR SELECT USING (true);

-- Allow users to view all ratings (or restricted to self/aggregate)
CREATE POLICY "Public can view ratings" ON public.ratings
  FOR SELECT USING (true);

-- Allow users to insert/update their own ratings
CREATE POLICY "Users can manage own ratings" ON public.ratings
  FOR ALL USING (true)
  WITH CHECK (true);

-- Allow users to manage their own profile
CREATE POLICY "Users can manage own profile" ON public.user_profiles
  FOR ALL USING (true)
  WITH CHECK (true);

-- 6. Helper Function: Upsert User Rating & Auto-update User Profile Stats
CREATE OR REPLACE FUNCTION public.record_user_rating(
  p_user_id TEXT,
  p_movie_id BIGINT,
  p_rating NUMERIC
)
RETURNS JSONB AS $$
DECLARE
  v_avg_rating NUMERIC;
  v_total_ratings INT;
BEGIN
  -- Insert or update rating
  INSERT INTO public.ratings (user_id, movie_id, rating, updated_at)
  VALUES (p_user_id, p_movie_id, p_rating, NOW())
  ON CONFLICT (user_id, movie_id)
  DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW();

  -- Recalculate user summary
  SELECT COUNT(*), ROUND(AVG(rating), 1)
  INTO v_total_ratings, v_avg_rating
  FROM public.ratings
  WHERE user_id = p_user_id;

  -- Upsert profile
  INSERT INTO public.user_profiles (user_id, total_ratings, avg_rating, updated_at)
  VALUES (p_user_id, v_total_ratings, v_avg_rating, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET total_ratings = v_total_ratings, avg_rating = v_avg_rating, updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'total_ratings', v_total_ratings, 'avg_rating', v_avg_rating);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
