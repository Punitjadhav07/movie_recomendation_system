import React from 'react';
import { X, Star, Sparkles, Film, User, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { getSimilarMovies } from '../services/recommendationEngine';

export default function MovieDetailsModal({
  movie,
  allMovies,
  onClose,
  onSelectMovie,
  onRateMovie,
  userRating
}) {
  if (!movie) return null;

  const similarMovies = getSimilarMovies(movie, allMovies, 3);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header Image Backdrop */}
        <div style={{ position: 'relative', height: '240px', overflow: 'hidden' }}>
          <img
            src={movie.backdrop || movie.poster}
            alt={movie.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, #121824 10%, rgba(18, 24, 36, 0.4) 60%, rgba(18, 24, 36, 0.8) 100%)'
          }} />

          <button
            className="modal-close-btn"
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.6)' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>

          <div style={{ position: 'absolute', bottom: '1rem', left: '1.5rem', right: '1.5rem' }}>
            {movie.matchPercentage && (
              <span className="hero-badge" style={{ marginBottom: '0.4rem' }}>
                <Sparkles size={12} /> {movie.matchPercentage}% Affinity Match
              </span>
            )}
            <h2 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#ffffff' }}>
              {movie.title} <span style={{ fontSize: '1.1rem', color: '#9ca3af', fontWeight: 400 }}>({movie.year})</span>
            </h2>
            {movie.tagline && (
              <p style={{ fontSize: '0.88rem', color: '#cbd5e1', fontStyle: 'italic', marginTop: '0.2rem' }}>
                "{movie.tagline}"
              </p>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Metadata Row */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '1rem',
            paddingBottom: '1rem',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#fbbf24', fontWeight: 600 }}>
              <Star size={15} fill="#fbbf24" /> {movie.rating} / 5.0 ({movie.voteCount?.toLocaleString()} votes)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Clock size={14} /> {movie.runtime}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <User size={14} /> Director: <strong style={{ color: 'var(--text-main)' }}>{movie.director}</strong>
            </span>
          </div>

          {/* Genres */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem' }}>
            {movie.genres.map(g => (
              <span key={g} className="genre-pill" style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}>
                {g}
              </span>
            ))}
          </div>

          {/* Synopsis */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.4rem' }}>
              Synopsis
            </h4>
            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.65 }}>
              {movie.overview}
            </p>
          </div>

          {/* Cast */}
          {movie.cast && movie.cast.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                Starring Cast
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {movie.cast.map(actor => (
                  <span
                    key={actor}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      color: 'var(--text-main)'
                    }}
                  >
                    {actor}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* User Rating Callout */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.75rem'
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ffffff' }}>Your Rating</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {userRating ? `You gave this movie ${userRating} stars` : 'Rate this movie to refine collaborative predictions'}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={22}
                  className="star-icon"
                  color={userRating >= star ? '#f59e0b' : '#4b5563'}
                  fill={userRating >= star ? '#f59e0b' : 'transparent'}
                  onClick={() => onRateMovie(movie.id, star)}
                />
              ))}
            </div>
          </div>

          {/* Item-Item Collaborative Filtering: Similar Movies */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Film size={15} color="#818cf8" />
                Item-Item CF: Viewers Who Liked This Also Watched
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
              {similarMovies.map((simMovie) => (
                <div
                  key={simMovie.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '0.65rem',
                    alignItems: 'center',
                    transition: 'var(--transition-smooth)'
                  }}
                  onClick={() => onSelectMovie(simMovie)}
                >
                  <img
                    src={simMovie.poster}
                    alt={simMovie.title}
                    style={{ width: '45px', height: '62px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {simMovie.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                      {simMovie.similarityScore}% Vector Match
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {simMovie.genres[0]} • {simMovie.year}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
