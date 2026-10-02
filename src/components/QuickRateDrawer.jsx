import React from 'react';
import { X, Star, CheckCircle2, Sparkles } from 'lucide-react';

export default function QuickRateDrawer({ catalogMovies, userRatings, onRateMovie, onClose }) {
  const ratedCount = Object.keys(userRatings).length;
  const targetCount = 5;
  const progressPct = Math.min(100, Math.round((ratedCount / targetCount) * 100));

  // Show the most popular movies first, limit to 30 for fast rating
  const moviesToRate = catalogMovies.slice(0, 30);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Star size={18} color="#f59e0b" fill="#f59e0b" />
              Quick Taste Calibration
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Rate 5+ movies so the SVD model can personalize your recommendations
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {/* Progress bar */}
          <div className="calibration-progress">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Calibration Progress</span>
              <span style={{ fontWeight: 600, color: progressPct === 100 ? '#10b981' : '#818cf8' }}>
                {ratedCount} / {targetCount} rated
              </span>
            </div>
            <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{
                width: `${progressPct}%`, height: '100%',
                background: progressPct === 100
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, #4f46e5, #6366f1)',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {moviesToRate.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              Loading movies... Make sure the ML backend is running.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '55vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {moviesToRate.map(movie => {
                const currentRating = userRatings[movie.id] || 0;
                return (
                  <div
                    key={movie.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.6rem 0.85rem',
                      background: currentRating ? 'rgba(79, 70, 229, 0.08)' : 'var(--bg-card)',
                      border: currentRating ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--border-subtle)',
                      borderRadius: '8px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>{movie.title}</div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                        {movie.year} • {movie.genres?.slice(0, 2).join(', ')}
                        {movie.vote_count ? ` • ${(movie.vote_count / 1000).toFixed(0)}k ratings` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {currentRating > 0 && <CheckCircle2 size={13} color="#10b981" style={{ marginRight: '4px' }} />}
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          size={18}
                          className="star-icon"
                          color={currentRating >= star ? '#f59e0b' : '#374151'}
                          fill={currentRating >= star ? '#f59e0b' : 'transparent'}
                          onClick={() => onRateMovie(movie.id, star, movie)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={onClose}>
              <Sparkles size={14} />
              <span>Done — Update Recommendations</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
