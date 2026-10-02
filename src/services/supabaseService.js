import { getSupabase, isSupabaseConnected } from './supabaseClient';

/**
 * Fetches all movies from Supabase or fallback mock data
 */
export async function fetchMoviesFromDb() {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConnected()) {
    return { data: INITIAL_MOVIES, source: 'local' };
  }

  try {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .order('rating', { ascending: false })
      .limit(300);

    if (error || !data || data.length === 0) {
      console.warn('Supabase movies query empty/failed:', error?.message);
      return { data: [], source: 'empty' };
    }

    // Map column naming if needed
    const mapped = data.map(m => ({
      id: m.id,
      title: m.title,
      year: m.year,
      genres: m.genres || [],
      rating: Number(m.rating) || 4.5,
      voteCount: m.vote_count || 1000,
      runtime: m.runtime || '120 min',
      director: m.director || 'Acclaimed Director',
      cast: m.cast_members || ['Lead Actor', 'Supporting Cast'],
      overview: m.overview || '',
      poster: m.poster || '',
      backdrop: m.backdrop || m.poster || '',
      tagline: m.tagline || '',
      featured: m.id === 1 || m.id === 296 || m.id === 318 || m.id === 356
    }));

    return { data: mapped, source: 'supabase' };
  } catch (err) {
    console.error('Error in fetchMoviesFromDb:', err);
    return { data: [], source: 'error' };
  }
}

/**
 * Saves a user rating to Supabase PostgreSQL database
 */
export async function syncRatingToSupabase(userId, movieId, rating) {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConnected()) {
    return { success: false, reason: 'not_connected' };
  }

  try {
    const { data, error } = await supabase
      .from('ratings')
      .upsert({
        user_id: userId || 'active_user',
        movie_id: movieId,
        rating: rating,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,movie_id' });

    if (error) {
      console.warn('Error syncing rating to Supabase:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Sync rating exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetches pre-computed item-item collaborative filtering similarities from Supabase
 */
export async function fetchSimilarMoviesFromDb(movieId) {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConnected()) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('movie_similarities')
      .select('movie_b, similarity_score')
      .eq('movie_a', movieId)
      .order('similarity_score', { ascending: false })
      .limit(4);

    if (error || !data || data.length === 0) {
      return null;
    }

    return data;
  } catch (err) {
    console.error('Failed to fetch similar movies from Supabase:', err);
    return null;
  }
}

/**
 * Fetches community ratings matrix from Supabase to feed the Collaborative Filtering engine
 */
export async function fetchCommunityRatingsFromDb() {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConnected()) {
    return COMMUNITY_USERS;
  }

  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('user_id, movie_id, rating')
      .limit(2000);

    if (error || !data || data.length === 0) {
      return [];
    }

    const userMap = {};
    data.forEach(r => {
      if (!userMap[r.user_id]) {
        userMap[r.user_id] = { id: r.user_id, ratings: {} };
      }
      userMap[r.user_id].ratings[r.movie_id] = Number(r.rating);
    });

    return Object.values(userMap);
  } catch (err) {
    console.error('Failed to fetch community ratings:', err);
    return [];
  }
}
