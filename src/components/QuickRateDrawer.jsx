import React from 'react';
import { X, Star, CheckCircle2, Sparkles, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function QuickRateDrawer({
  allMovies,
  userRatings,
  onRateMovie,
  onClose
}) {
  const ratedCount = Object.keys(userRatings).length;
  const targetCount = 5;
  const progressPct = Math.min(100, Math.round((ratedCount / targetCount) * 100));

  const handleRate = (movieId, score) => {
    onRateMovie(movieId, score);
    if (ratedCount + 1 === targetCount) {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Star size={18} color="#f59e0b" fill="#f59e0b" />
              Quick Taste Calibration
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Rate at least 5 movies to personalize your collaborative filtering feed
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Calibration Progress Bar */}
          <div style={{
            background: 'var(--bg-card)',
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Calibration Progress</span>
              <span style={{ fontWeight: 600, color: progressPct === 100 ? '#10b981' : '#818cf8' }}>
                {ratedCount} / {targetCount} Movies Rated
              </span>
            </div>
            <div style={{ height: '7px', background: 'var(--bg-secondary)', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progressPct}%`,
                  height: '100%',
                  background: progressPct === 100 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #4f46e5, #6366f1)',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>

          {/* Movie List for Fast Rating */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '50vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {allMovies.map((movie) => {
              const currentRating = userRatings[movie.id] || 0;
              return (
                <div
                  key={movie.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: currentRating ? 'rgba(79, 70, 229, 0.08)' : 'var(--bg-card)',
                    border: currentRating ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--border-subtle)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      style={{ width: '40px', height: '56px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff' }}>
                        {movie.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {movie.genres.slice(0, 2).join(', ')} • {movie.year}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={18}
                        className="star-icon"
                        color={currentRating >= star ? '#f59e0b' : '#374151'}
                        fill={currentRating >= star ? '#f59e0b' : 'transparent'}
                        onClick={() => handleRate(movie.id, star)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button className="btn btn-primary" onClick={onClose}>
              <Sparkles size={15} />
              <span>Apply & See Updated Recommendations</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
