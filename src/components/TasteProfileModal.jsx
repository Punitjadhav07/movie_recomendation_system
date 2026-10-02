import React, { useMemo } from 'react';
import { X, BarChart2, Star, Sparkles, Brain, RefreshCw } from 'lucide-react';

function computeProfile(userRatings, ratedMoviesCache) {
  const ids = Object.keys(userRatings).map(Number);
  const totalRated = ids.length;
  if (totalRated === 0) {
    return { totalRated: 0, avgRating: 0, topGenres: [], archetype: 'New Explorer' };
  }

  const avgRating = Math.round(
    ids.reduce((sum, id) => sum + (userRatings[id] || 0), 0) / totalRated * 10
  ) / 10;

  // Count genres from ratedMoviesCache
  const genreCounts = {};
  let coveredMovies = 0;
  for (const id of ids) {
    const movie = ratedMoviesCache[id];
    if (!movie) continue;
    coveredMovies++;
    for (const g of (movie.genres || [])) {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    }
  }

  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([genre, count]) => ({
      genre,
      count,
      percentage: Math.round((count / (coveredMovies || 1)) * 100)
    }));

  const top = topGenres[0]?.genre || '';
  const archetypes = {
    Drama: 'Deep Storyteller', Action: 'Adrenaline Seeker', Comedy: 'Joy Hunter',
    Thriller: 'Edge Walker', 'Sci-Fi': 'Future Gazer', Horror: 'Dark Explorer',
    Documentary: 'Truth Seeker', Romance: 'Heart Follower', Animation: 'Wonder Keeper',
    Crime: 'Mind Detective', Adventure: 'World Wanderer', Fantasy: 'Dream Weaver'
  };
  const archetype = archetypes[top] || (avgRating >= 4.0 ? 'Cinephile' : 'Eclectic Explorer');

  return { totalRated, avgRating, topGenres, archetype };
}

export default function TasteProfileModal({ userRatings, ratedMoviesCache, onClose, onResetRatings }) {
  const profile = useMemo(
    () => computeProfile(userRatings, ratedMoviesCache || {}),
    [userRatings, ratedMoviesCache]
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: 'rgba(79,70,229,0.2)', border: '1px solid rgba(79,70,229,0.4)', padding: '0.45rem', borderRadius: '8px' }}>
              <Brain size={18} color="#818cf8" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Taste Profile</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Derived from your {profile.totalRated} rated movie{profile.totalRated !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {/* Archetype */}
          <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #172554)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Taste Archetype</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{profile.archetype}</div>
              <div style={{ fontSize: '0.8rem', color: '#c7d2fe', marginTop: '0.2rem' }}>
                {profile.totalRated >= 5
                  ? `SVD model using ${profile.totalRated} ratings for personalization`
                  : `Rate ${Math.max(0, 5 - profile.totalRated)} more movies for SVD personalization`}
              </div>
            </div>
            <Sparkles size={30} color="#fbbf24" />
          </div>

          {/* Stats */}
          <div className="stat-grid">
            <div className="stat-box">
              <div className="stat-val">{profile.totalRated}</div>
              <div className="stat-lbl">Movies Rated</div>
            </div>
            <div className="stat-box">
              <div className="stat-val">{profile.avgRating > 0 ? profile.avgRating + '★' : '—'}</div>
              <div className="stat-lbl">Avg Rating</div>
            </div>
            <div className="stat-box">
              <div className="stat-val" style={{ color: '#10b981' }}>
                {profile.topGenres[0]?.genre || '—'}
              </div>
              <div className="stat-lbl">Top Genre</div>
            </div>
          </div>

          {/* Genre bars */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BarChart2 size={14} color="#818cf8" /> Genre Distribution
            </h4>
            {profile.topGenres.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {profile.topGenres.map(item => (
                  <div key={item.genre}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                      <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{item.genre}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.count} ({item.percentage}%)</span>
                    </div>
                    <div style={{ height: '5px', background: 'var(--bg-card)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.percentage}%`, height: '100%', background: 'linear-gradient(90deg, #4f46e5, #3b82f6)', borderRadius: '999px' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {profile.totalRated === 0
                  ? 'No ratings yet. Rate movies to see your genre distribution.'
                  : 'Genre data unavailable for your rated movies.'}
              </p>
            )}
          </div>

          {/* How recommendations work */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.9rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={13} color="#f59e0b" /> How recommendations work
            </div>
            Your ratings are sent to the FastAPI backend. The SVD model projects them into a 64-dimensional latent space and ranks 3,000 candidate movies by cosine similarity to your taste vector. Predicted ratings are estimates based on latent factor alignment.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={onResetRatings} style={{ fontSize: '0.8rem', color: '#f87171' }}>
              <RefreshCw size={13} /> Reset Ratings
            </button>
            <button className="btn btn-primary" onClick={onClose} style={{ fontSize: '0.8rem' }}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
