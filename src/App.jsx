import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { fetchMovies, searchMovies, getRecommendations, postRating, checkHealth } from './services/mlApi';
import { syncRatingToSupabase } from './services/supabaseService';
import Navbar from './components/Navbar';
import GenreSelection from './pages/GenreSelection';
import MovieCard from './components/MovieCard';
import FilterBar from './components/FilterBar';
import MovieDetailsModal from './components/MovieDetailsModal';
import TasteProfileModal from './components/TasteProfileModal';
import QuickRateDrawer from './components/QuickRateDrawer';
import { useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import { Sparkles, Film, Star, AlertCircle, Loader, RefreshCw } from 'lucide-react';

export default function App() {
  const { user, logout } = useAuth();

  if (!user) return <AuthPage />;

  const genreKey = `cinematch_user_genres_${user.id}`;
  const ratingsKey = `cinematch_ratings_${user.id}`;
  const ratedCacheKey = `cinematch_rated_cache_${user.id}`;

  // User preferences
  const [selectedGenres, setSelectedGenres] = useState(() => {
    const saved = localStorage.getItem(genreKey);
    if (saved === 'dismissed') return ['__all__'];
    return saved ? JSON.parse(saved) : [];
  });

  // User ratings: {movieId: starRating}
  const [userRatings, setUserRatings] = useState(() => {
    const saved = localStorage.getItem(ratingsKey);
    return saved ? JSON.parse(saved) : {};
  });

  // Cache of movie objects the user has rated (for My Ratings tab)
  const [ratedMoviesCache, setRatedMoviesCache] = useState(() => {
    const saved = localStorage.getItem(ratedCacheKey);
    return saved ? JSON.parse(saved) : {};
  });

  // Movies from API (catalog browse)
  const [catalogMovies, setCatalogMovies] = useState([]);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Recommendations from ML backend
  const [recommendations, setRecommendations] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsPersonalized, setRecsPersonalized] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Backend status
  const [backendAvailable, setBackendAvailable] = useState(null); // null=checking, true, false

  // UI state
  const [activeTab, setActiveTab] = useState('for-you');
  const [sortBy, setSortBy] = useState('popular');
  const [minRating, setMinRating] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isTasteProfileOpen, setIsTasteProfileOpen] = useState(false);
  const [isQuickRateOpen, setIsQuickRateOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const searchDebounceRef = useRef(null);
  const recsDebounceRef = useRef(null);

  // Persist ratings to localStorage
  useEffect(() => {
    localStorage.setItem(ratingsKey, JSON.stringify(userRatings));
  }, [userRatings, ratingsKey]);

  useEffect(() => {
    localStorage.setItem(ratedCacheKey, JSON.stringify(ratedMoviesCache));
  }, [ratedMoviesCache, ratedCacheKey]);

  // Check backend health on mount
  useEffect(() => {
    checkHealth().then(ok => setBackendAvailable(ok));
  }, []);

  // Load catalog on mount and when tab/sort/genre changes
  useEffect(() => {
    if (activeTab === 'all' || activeTab === 'top-rated') {
      loadCatalog(1);
    }
  }, [activeTab, sortBy]);

  // Fetch recommendations when ratings change or user opens "For You" tab
  useEffect(() => {
    if (activeTab !== 'for-you') return;
    clearTimeout(recsDebounceRef.current);
    recsDebounceRef.current = setTimeout(() => {
      loadRecommendations();
    }, 400);
    return () => clearTimeout(recsDebounceRef.current);
  }, [userRatings, selectedGenres, activeTab]);

  // Load initial catalog for QuickRate (needs movies to rate)
  useEffect(() => {
    if (catalogMovies.length === 0) {
      loadCatalog(1);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    clearTimeout(searchDebounceRef.current);
    setSearchLoading(true);
    searchDebounceRef.current = setTimeout(async () => {
      const { data } = await searchMovies(searchQuery, 40);
      setSearchResults(data?.movies || []);
      setSearchLoading(false);
    }, 350);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchQuery]);

  async function loadCatalog(page = 1) {
    setCatalogLoading(true);
    const sort = activeTab === 'top-rated' ? 'rating' : (sortBy || 'popular');
    const { data, error } = await fetchMovies({ page, limit: 60, sort });
    if (error) {
      setCatalogLoading(false);
      return;
    }
    if (page === 1) {
      setCatalogMovies(data.movies);
    } else {
      setCatalogMovies(prev => [...prev, ...data.movies]);
    }
    setCatalogPage(page);
    setCatalogTotal(data.total);
    setCatalogLoading(false);
  }

  async function loadRecommendations() {
    setRecsLoading(true);
    const activeGenres = (selectedGenres || []).filter(g => g !== '__all__' && g !== 'All');
    const { data, error } = await getRecommendations(
      userRatings,
      30,
      activeGenres.length > 0 ? activeGenres : null
    );
    if (!error && data) {
      setRecommendations(data.recommendations || []);
      setRecsPersonalized(data.is_personalized || false);
    }
    setRecsLoading(false);
  }

  const handleRateMovie = useCallback(async (movieId, rating, movieObject) => {
    setUserRatings(prev => ({ ...prev, [movieId]: rating }));

    // Cache movie object for My Ratings tab
    if (movieObject) {
      setRatedMoviesCache(prev => ({ ...prev, [movieId]: movieObject }));
    }

    const title = movieObject?.title || `Movie #${movieId}`;
    showToast(`Rated "${title}" ${rating}★`);

    // Sync to backend (fire-and-forget)
    postRating(user.id, movieId, rating).catch(() => {});
    syncRatingToSupabase(user.id, movieId, rating).catch(() => {});
  }, [user.id]);

  const handleResetRatings = () => {
    setUserRatings({});
    setRatedMoviesCache({});
    localStorage.removeItem(ratingsKey);
    localStorage.removeItem(ratedCacheKey);
    setRecommendations([]);
    showToast('All ratings reset.');
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(c => c === msg ? null : c), 3000);
  };

  const ratedCount = Object.keys(userRatings).length;

  // --- Derive displayed movie list based on active tab ---
  const displayedMovies = useMemo(() => {
    if (searchQuery.trim()) return searchResults;

    if (activeTab === 'for-you') {
      let list = [...recommendations];
      if (minRating > 0) list = list.filter(m => (m.rating || 0) >= minRating);
      return list;
    }

    if (activeTab === 'my-ratings') {
      return Object.entries(ratedMoviesCache)
        .filter(([id]) => userRatings[id] !== undefined)
        .map(([id, m]) => ({ ...m, userRating: userRatings[id] }));
    }

    // 'all' or 'top-rated'
    let list = [...catalogMovies];
    const activeGenres = (selectedGenres || []).filter(g => g !== '__all__' && g !== 'All');
    if (activeGenres.length > 0) {
      list = list.filter(m => m.genres?.some(g => activeGenres.includes(g)));
    }
    if (minRating > 0) {
      list = list.filter(m => (m.rating || 0) >= minRating);
    }
    if (activeTab === 'top-rated') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    return list;
  }, [activeTab, recommendations, catalogMovies, searchQuery, searchResults, selectedGenres, minRating, userRatings, ratedMoviesCache]);

  const isLoading = (activeTab === 'for-you' && recsLoading) ||
    (['all', 'top-rated'].includes(activeTab) && catalogLoading && catalogMovies.length === 0) ||
    (searchQuery && searchLoading);

  // ------------------------------------------------------------------ render

  return (
    <div className="app-container">
      {selectedGenres.length === 0 && (
        <GenreSelection
          onSave={(selected) => {
            if (selected.length > 0) {
              localStorage.setItem(genreKey, JSON.stringify(selected));
              setSelectedGenres(selected);
            } else {
              localStorage.setItem(genreKey, 'dismissed');
              setSelectedGenres(['__all__']);
            }
          }}
        />
      )}

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        ratedCount={ratedCount}
        onOpenTasteProfile={() => setIsTasteProfileOpen(true)}
        onOpenQuickRate={() => setIsQuickRateOpen(true)}
        backendAvailable={backendAvailable}
        onLogout={logout}
      />

      <main className="main-content">
        {/* Backend unavailable warning */}
        {backendAvailable === false && (
          <div className="backend-warning">
            <AlertCircle size={16} />
            <span>
              ML backend offline. Start it with:{' '}
              <code>venv/bin/uvicorn ml.app:app --port 8000</code>
            </span>
          </div>
        )}

        {/* Cold-start calibration banner */}
        {ratedCount < 5 && activeTab === 'for-you' && !searchQuery && (
          <div className="calibration-banner">
            <div className="calibration-info">
              <div className="calibration-icon"><Sparkles size={18} /></div>
              <div>
                <div className="calibration-title">
                  Rate {Math.max(0, 5 - ratedCount)} more movie{5 - ratedCount !== 1 ? 's' : ''} for personalized SVD recommendations
                </div>
                <div className="calibration-sub">
                  {ratedCount === 0
                    ? 'Currently showing popular movies. Rate to personalize.'
                    : `${ratedCount}/5 rated — getting closer to personalized picks.`}
                </div>
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => setIsQuickRateOpen(true)}>
              Quick Rate
            </button>
          </div>
        )}

        <FilterBar
          selectedGenres={selectedGenres}
          setSelectedGenres={setSelectedGenres}
          sortBy={sortBy}
          setSortBy={setSortBy}
          minRating={minRating}
          setMinRating={setMinRating}
          showSortBy={activeTab !== 'for-you' && activeTab !== 'top-rated'}
        />

        {/* Section header */}
        <div className="section-header">
          <div>
            <h2 className="section-title">
              {searchQuery ? (
                <><Film size={20} /><span>Search: "{searchQuery}"</span></>
              ) : activeTab === 'for-you' ? (
                <><Sparkles size={20} /><span>For You</span></>
              ) : activeTab === 'top-rated' ? (
                <><Star size={20} /><span>Top Rated</span></>
              ) : activeTab === 'my-ratings' ? (
                <><Star size={20} fill="currentColor" /><span>My Ratings ({ratedCount})</span></>
              ) : (
                <><Film size={20} /><span>Browse Catalog</span></>
              )}
            </h2>
            <p className="section-subtitle">
              {searchQuery
                ? `${displayedMovies.length} result${displayedMovies.length !== 1 ? 's' : ''} for "${searchQuery}"`
                : activeTab === 'for-you' && recsPersonalized
                  ? `SVD latent factor recommendations — ${ratedCount} rated movie${ratedCount !== 1 ? 's' : ''} used`
                  : activeTab === 'for-you' && !recsPersonalized
                    ? 'Showing popular picks — rate movies to personalize'
                    : activeTab === 'top-rated'
                      ? 'Sorted by community average rating'
                      : activeTab === 'my-ratings'
                        ? 'Your ratings history'
                        : `${catalogTotal.toLocaleString()} movies in catalog`}
            </p>
          </div>

          {activeTab === 'for-you' && ratedCount >= 5 && (
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem' }}
              onClick={loadRecommendations}
              disabled={recsLoading}
            >
              <RefreshCw size={13} className={recsLoading ? 'spin' : ''} />
              Refresh
            </button>
          )}
        </div>

        {/* Movie grid */}
        {isLoading ? (
          <div className="loading-state">
            <Loader size={28} className="spin" />
            <span>Loading…</span>
          </div>
        ) : displayedMovies.length > 0 ? (
          <>
            <div className="movie-grid">
              {displayedMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onSelectMovie={setSelectedMovie}
                  onRateMovie={handleRateMovie}
                  userRating={userRatings[movie.id]}
                />
              ))}
            </div>

            {/* Load more for catalog tabs */}
            {(activeTab === 'all') && catalogMovies.length < catalogTotal && (
              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => loadCatalog(catalogPage + 1)}
                  disabled={catalogLoading}
                >
                  {catalogLoading ? 'Loading…' : `Load more (${catalogTotal - catalogMovies.length} remaining)`}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <Film size={36} />
            <h3>
              {activeTab === 'my-ratings'
                ? "No ratings yet"
                : backendAvailable === false
                  ? "ML backend offline"
                  : "No movies found"}
            </h3>
            <p>
              {activeTab === 'my-ratings'
                ? "Rate movies to see your history here."
                : backendAvailable === false
                  ? "Start the backend: venv/bin/uvicorn ml.app:app --port 8000"
                  : "Try adjusting your filters or search query."}
            </p>
            {activeTab === 'my-ratings' && (
              <button className="btn btn-primary" onClick={() => setIsQuickRateOpen(true)}>
                Rate Movies
              </button>
            )}
          </div>
        )}
      </main>

      {selectedMovie && (
        <MovieDetailsModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onSelectMovie={setSelectedMovie}
          onRateMovie={handleRateMovie}
          userRating={userRatings[selectedMovie.id]}
        />
      )}

      {isTasteProfileOpen && (
        <TasteProfileModal
          userRatings={userRatings}
          ratedMoviesCache={ratedMoviesCache}
          onClose={() => setIsTasteProfileOpen(false)}
          onResetRatings={handleResetRatings}
        />
      )}

      {isQuickRateOpen && (
        <QuickRateDrawer
          catalogMovies={catalogMovies}
          userRatings={userRatings}
          onRateMovie={handleRateMovie}
          onClose={() => setIsQuickRateOpen(false)}
        />
      )}

      {toastMessage && (
        <div className="toast-toast">
          <Star size={14} fill="#f59e0b" color="#f59e0b" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
