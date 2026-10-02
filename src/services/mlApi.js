/**
 * CineMatch ML API client.
 * Communicates with the FastAPI backend at VITE_ML_API_URL (default: http://localhost:8000).
 *
 * All functions return {data, error} — never throw.
 */

const BASE = (import.meta.env.VITE_ML_API_URL || 'http://localhost:8000').replace(/\/$/, '');

async function req(path, options = {}) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.detail || `HTTP ${res.status}` };
    }
    return { data: await res.json(), error: null };
  } catch (err) {
    return { data: null, error: 'ML backend unavailable. Start it with: venv/bin/uvicorn ml.app:app --port 8000' };
  }
}

/** Check if the backend is reachable. Returns true/false. */
export async function checkHealth() {
  const { data } = await req('/health');
  return data?.status === 'healthy';
}

/**
 * Fetch paginated catalog movies.
 * @param {object} opts - {page, limit, genre, sort}
 */
export async function fetchMovies({ page = 1, limit = 50, genre = '', sort = 'popular' } = {}) {
  const params = new URLSearchParams({ page, limit, sort });
  if (genre && genre !== 'All' && genre !== '__all__') params.set('genre', genre);
  return req(`/movies?${params}`);
}

/**
 * Search all 62k movies by title.
 * @param {string} query
 * @param {number} limit
 */
export async function searchMovies(query, limit = 20) {
  if (!query.trim()) return { data: { movies: [], total: 0 }, error: null };
  const params = new URLSearchParams({ q: query.trim(), limit });
  return req(`/movies/search?${params}`);
}

/**
 * Get personalized recommendations from the SVD model.
 * @param {object} ratings - {movieId: starRating} from user's localStorage
 * @param {number} n - number of results
 * @param {string[]} genreFilter - optional genre filter
 */
export async function getRecommendations(ratings, n = 20, genreFilter = null) {
  const ratingsStr = Object.fromEntries(
    Object.entries(ratings).map(([k, v]) => [String(k), Number(v)])
  );
  const body = { ratings: ratingsStr, n };
  if (genreFilter && genreFilter.length > 0) body.genre_filter = genreFilter;
  return req('/recommend', { method: 'POST', body: JSON.stringify(body) });
}

/**
 * Post a single rating to the backend (ephemeral, for server-side user history).
 * localStorage is the primary persistence; this is secondary.
 */
export async function postRating(userId, movieId, rating) {
  return req('/ratings', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, movie_id: Number(movieId), rating: Number(rating) })
  });
}

/**
 * Get similar movies via latent space nearest-neighbors.
 */
export async function getSimilarMovies(movieId, n = 4) {
  return req(`/similar/${movieId}?n=${n}`);
}

/** Fetch full health payload (not just boolean). */
export async function fetchHealth() {
  return req('/health');
}

/** Fetch admin dashboard stats. Requires admin API key. */
export async function fetchAdminStats(adminKey) {
  try {
    const res = await fetch(`${BASE}/admin/stats`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': adminKey || '',
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.detail || `HTTP ${res.status}` };
    }
    return { data: await res.json(), error: null };
  } catch (err) {
    return { data: null, error: 'ML backend unavailable.' };
  }
}
