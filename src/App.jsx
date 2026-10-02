import React, { useState, useMemo, useEffect } from 'react';
import { INITIAL_MOVIES, INITIAL_USER_RATINGS } from './data/mockMovies';
import { generatePersonalizedRecommendations } from './services/recommendationEngine';
import { fetchMoviesFromDb, syncRatingToSupabase } from './services/supabaseService';
import Navbar from './components/Navbar';
import GenreSelection from './pages/GenreSelection';
import HeroBanner from './components/HeroBanner';
import MovieCard from './components/MovieCard';
import FilterBar from './components/FilterBar';
import MovieDetailsModal from './components/MovieDetailsModal';
import TasteProfileModal from './components/TasteProfileModal';
import QuickRateDrawer from './components/QuickRateDrawer';
import SupabaseConfigModal from './components/SupabaseConfigModal';
import MLInsightsModal from './components/MLInsightsModal';
import { useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import { Sparkles, Film, Star, Sliders, CheckCircle, RefreshCw, LogOut, Shield } from 'lucide-react';

export default function App() {
  const { user, role, logout } = useAuth();

  // If user is not authenticated, show the Login/Signup page first
  if (!user) {
    return <AuthPage />;
  }

  // Application State
  const [movies, setMovies] = useState(INITIAL_MOVIES);
  const [dataSource, setDataSource] = useState('local');
  const [userRatings, setUserRatings] = useState(() => {
    const saved = localStorage.getItem('cinematch_ratings');
    // Never seed fake ratings — start from empty so count is accurate
    return saved ? JSON.parse(saved) : {};
  });

  const [activeTab, setActiveTab] = useState('for-you'); // 'for-you' | 'top-rated' | 'all' | 'my-ratings'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenres, setSelectedGenres] = useState(() => {
    const saved = localStorage.getItem('cinematch_user_genres');
    // 'dismissed' means the user already saw and skipped the modal — don't show again
    if (saved === 'dismissed') return ['__all__'];
    return saved ? JSON.parse(saved) : [];
  });
  const [sortBy, setSortBy] = useState('match');
  const [minRating, setMinRating] = useState(0);

  // Load movies from Supabase or local catalog on mount
  useEffect(() => {
    async function loadCatalog() {
      const res = await fetchMoviesFromDb();
      if (res && res.data && res.data.length > 0) {
        setMovies(res.data);
        setDataSource(res.source);
      }
    }
    loadCatalog();
  }, []);

  // Modal States
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isTasteProfileOpen, setIsTasteProfileOpen] = useState(false);
  const [isQuickRateOpen, setIsQuickRateOpen] = useState(false);
  const [isSupabaseConfigOpen, setIsSupabaseConfigOpen] = useState(false);
  const [isMLInsightsOpen, setIsMLInsightsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Save ratings to LocalStorage
  useEffect(() => {
    localStorage.setItem('cinematch_ratings', JSON.stringify(userRatings));
  }, [userRatings]);

  // Compute Collaborative Filtering Recommended Movies
  const scoredMovies = useMemo(() => {
    return generatePersonalizedRecommendations(userRatings, movies, selectedGenres);
  }, [userRatings, movies, selectedGenres]);

  // Rate Movie Handler
  const handleRateMovie = async (movieId, rating) => {
    setUserRatings((prev) => {
      const updated = { ...prev, [movieId]: rating };
      return updated;
    });

    const targetMovie = movies.find(m => m.id === movieId);
    const movieTitle = targetMovie ? targetMovie.title : 'Movie';
    showToast(`Rated ${movieTitle} ${rating}★ — Collaborative vectors updated!`);

    // Sync to Supabase in background
    try {
      await syncRatingToSupabase('default_user', movieId, rating);
    } catch (e) {
      console.warn('Supabase rating sync skipped/local mode:', e);
    }
  };

  const handleResetRatings = () => {
    setUserRatings({});
    localStorage.removeItem('cinematch_ratings');
    showToast('Reset all ratings to fresh state.');
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3200);
  };

  // Filter and Sort Movies based on current tab and user controls
  const displayedMovies = useMemo(() => {
    let list = [...scoredMovies];

    // Filter by Tab
    if (activeTab === 'for-you') {
      list = list.sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));
    } else if (activeTab === 'top-rated') {
      list = list.sort((a, b) => b.rating - a.rating);
    } else if (activeTab === 'my-ratings') {
      list = list.filter(m => userRatings[m.id] !== undefined);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.director.toLowerCase().includes(q) ||
        m.genres.some(g => g.toLowerCase().includes(q)) ||
        (m.cast && m.cast.some(c => c.toLowerCase().includes(q)))
      );
    }

    // Filter by user-preferred genres (from FilterBar toggle — separate from onboarding)
    // '__all__' sentinel means user skipped genre selection
    if (
      selectedGenres &&
      selectedGenres.length > 0 &&
      !selectedGenres.includes('All') &&
      !selectedGenres.includes('__all__')
    ) {
      list = list.filter(m => m.genres.some(g => selectedGenres.includes(g)));
    }

    // Filter by Min Rating
    if (minRating > 0) {
      list = list.filter(m => m.rating >= minRating);
    }

    // Secondary Sort override if specified
    if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'year_desc') {
      list.sort((a, b) => b.year - a.year);
    } else if (sortBy === 'year_asc') {
      list.sort((a, b) => a.year - b.year);
    } else if (sortBy === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'match') {
      list.sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));
    }

    return list;
  }, [scoredMovies, activeTab, searchQuery, selectedGenres, minRating, sortBy, userRatings]);

  // Featured hero movie is the top collaborative match
  const heroMovie = useMemo(() => {
    return scoredMovies.find(m => m.featured) || scoredMovies[0];
  }, [scoredMovies]);

  const ratedCount = Object.keys(userRatings).length;

  return (
    <div className="app-container">
      {/* Genre Selection Modal — shown ONCE for brand-new users only */}
      {(selectedGenres.length === 0) && (
        <GenreSelection
          onSave={(selected) => {
            if (selected.length > 0) {
              localStorage.setItem('cinematch_user_genres', JSON.stringify(selected));
              setSelectedGenres(selected);
            } else {
              // User clicked "Skip" — store sentinel so modal never shows again
              localStorage.setItem('cinematch_user_genres', 'dismissed');
              setSelectedGenres(['__all__']);
            }
          }}
        />
      )}

      {/* Navbar — always rendered so layout is intact beneath modal */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        ratedCount={ratedCount}
        onOpenTasteProfile={() => setIsTasteProfileOpen(true)}
        onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
        onOpenQuickRate={() => setIsQuickRateOpen(true)}
        onOpenMLInsights={() => setIsMLInsightsOpen(true)}
      />

      <main className="main-content">
        {/* Hero Spotlight (shown on 'For You' tab when no search query is active) */}
        {activeTab === 'for-you' && !searchQuery && heroMovie && (
          <HeroBanner
            movie={heroMovie}
            onSelectMovie={setSelectedMovie}
            onRateMovie={handleRateMovie}
            userRating={userRatings[heroMovie.id]}
          />
        )}

        {/* Calibration Banner for Cold-Start / New Users */}
        {ratedCount < 3 && (
          <div className="calibration-banner">
            <div className="calibration-info">
              <div style={{
                background: 'rgba(79, 70, 229, 0.2)',
                padding: '0.5rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Sparkles size={18} color="#818cf8" />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff' }}>
                  Calibrate Your Collaborative Filtering Recommendations
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Rate {3 - ratedCount} more movie{3 - ratedCount > 1 ? 's' : ''} to unlock high-precision taste vectors.
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
              onClick={() => setIsQuickRateOpen(true)}
            >
              Start Quick Calibration
            </button>
          </div>
        )}

        {/* Filter and Sorting Toolbar */}
        <FilterBar
          selectedGenres={selectedGenres}
          setSelectedGenres={setSelectedGenres}
          sortBy={sortBy}
          setSortBy={setSortBy}
          minRating={minRating}
          setMinRating={setMinRating}
        />

        {/* Section Header */}
        <div className="section-header">
          <div>
            <h2 className="section-title">
              {activeTab === 'for-you' && (
                <>
                  <Sparkles size={20} color="#818cf8" />
                  <span>Personalized Recommendations</span>
                </>
              )}
              {activeTab === 'top-rated' && (
                <>
                  <Film size={20} color="#f59e0b" />
                  <span>Critically Acclaimed & Top Rated</span>
                </>
              )}
              {activeTab === 'all' && (
                <>
                  <Film size={20} color="#60a5fa" />
                  <span>Complete Movie Catalog</span>
                </>
              )}
              {activeTab === 'my-ratings' && (
                <>
                  <Star size={20} color="#f59e0b" fill="#f59e0b" />
                  <span>Your Rated Movies ({ratedCount})</span>
                </>
              )}
            </h2>
            <p className="section-subtitle">
              {activeTab === 'for-you' && 'Ranked dynamically using Item-Item similarity and Collaborative community vectors'}
              {activeTab === 'top-rated' && 'Highest rated cinema masterpieces across global audiences'}
              {activeTab === 'all' && `Browsing ${displayedMovies.length} movies with active filters`}
              {activeTab === 'my-ratings' && 'Your explicit feedback used to train the recommendation engine'}
            </p>
          </div>
        </div>

        {/* Movie Grid */}
        {displayedMovies.length > 0 ? (
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
        ) : (
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '3rem 2rem',
            textAlign: 'center',
            marginTop: '1.5rem'
          }}>
            <Film size={36} color="#6b7280" style={{ marginBottom: '0.85rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.35rem' }}>
              No movies matched your current criteria
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              {activeTab === 'my-ratings'
                ? "You haven't rated any movies yet. Explore the catalog or click 'Calibrate Taste' to start!"
                : 'Try adjusting your genre filters or search query.'}
            </p>
            {activeTab === 'my-ratings' ? (
              <button className="btn btn-primary" onClick={() => setIsQuickRateOpen(true)}>
                Rate Movies Now
              </button>
            ) : (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedGenres(['__all__']);
                  setSearchQuery('');
                  setMinRating(0);
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {selectedMovie && (
        <MovieDetailsModal
          movie={selectedMovie}
          allMovies={movies}
          onClose={() => setSelectedMovie(null)}
          onSelectMovie={(movie) => setSelectedMovie(movie)}
          onRateMovie={handleRateMovie}
          userRating={userRatings[selectedMovie.id]}
        />
      )}

      {isTasteProfileOpen && (
        <TasteProfileModal
          userRatings={userRatings}
          allMovies={movies}
          onClose={() => setIsTasteProfileOpen(false)}
          onResetRatings={handleResetRatings}
        />
      )}

      {isQuickRateOpen && (
        <QuickRateDrawer
          allMovies={movies}
          userRatings={userRatings}
          onRateMovie={handleRateMovie}
          onClose={() => setIsQuickRateOpen(false)}
        />
      )}

      {isSupabaseConfigOpen && (
        <SupabaseConfigModal
          onClose={() => setIsSupabaseConfigOpen(false)}
          onConfigSaved={() => showToast('Supabase settings updated!')}
        />
      )}

      {isMLInsightsOpen && (
        <MLInsightsModal
          onClose={() => setIsMLInsightsOpen(false)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-toast">
          <CheckCircle size={16} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
