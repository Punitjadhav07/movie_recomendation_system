import React from 'react';
import { Sparkles, Info, Star } from 'lucide-react';

export default function HeroBanner({ movie, onSelectMovie, onRateMovie, userRating }) {
  if (!movie) return null;

  return (
    <div className="hero-card">
      <div
        className="hero-backdrop"
        style={{ backgroundImage: `url(${movie.backdrop || movie.poster})` }}
      />
      <div className="hero-gradient" />
      <div className="hero-content">
        <div className="hero-badge">
          <Sparkles size={13} />
          <span>{movie.recommendationReason || 'Featured Pick'}</span>
        </div>

        <h1 className="hero-title">{movie.title}</h1>

        <div className="hero-meta">
          <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
            <Star size={15} fill="#fbbf24" /> {movie.rating}
          </span>
          <span>•</span>
          <span>{movie.year}</span>
          <span>•</span>
          <span>{movie.runtime}</span>
          <span>•</span>
          <span>{movie.genres.join(', ')}</span>
        </div>

        <p className="hero-overview">{movie.overview}</p>

        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => onSelectMovie(movie)}>
            <Info size={16} />
            <span>Explore Details & Similar</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(24, 32, 48, 0.8)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Your Rating:</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={16}
                className="star-icon"
                color={userRating >= star ? '#f59e0b' : '#4b5563'}
                fill={userRating >= star ? '#f59e0b' : 'transparent'}
                onClick={() => onRateMovie(movie.id, star)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
