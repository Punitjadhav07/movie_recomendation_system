import React, { useState } from 'react';
import { Star, Sparkles, CheckCircle2 } from 'lucide-react';

export default function MovieCard({ movie, onSelectMovie, onRateMovie, userRating }) {
  const [hoverRating, setHoverRating] = useState(0);

  const handleStarClick = (e, starVal) => {
    e.stopPropagation();
    onRateMovie(movie.id, starVal);
  };

  const handleStarHover = (e, starVal) => {
    e.stopPropagation();
    setHoverRating(starVal);
  };

  const handleStarLeave = (e) => {
    e.stopPropagation();
    setHoverRating(0);
  };

  const displayRating = hoverRating || userRating || 0;

  return (
    <div className="movie-card" onClick={() => onSelectMovie(movie)}>
      <div className="card-poster-wrap">
        <img
          src={movie.poster}
          alt={movie.title}
          className="card-poster"
          loading="lazy"
        />




        {/* Global Rating */}
        <div className="card-rating-badge">
          <Star size={12} fill="#fbbf24" />
          <span>{movie.rating}</span>
        </div>
      </div>

      <div className="card-body">
        <h3 className="card-title" title={movie.title}>{movie.title}</h3>
        
        <div className="card-meta">
          <span>{movie.year}</span>
          <span>•</span>
          <span>{movie.runtime}</span>
          <span>•</span>
          <span>{movie.director}</span>
        </div>

        <div className="card-genres">
          {movie.genres.slice(0, 3).map((genre) => (
            <span key={genre} className="genre-pill">{genre}</span>
          ))}
        </div>

        {movie.recommendationReason && (
          <div className="card-reason" title={movie.recommendationReason}>
            💡 {movie.recommendationReason}
          </div>
        )}

        {/* Interactive Rating Area */}
        <div className="card-user-rate">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', color: userRating ? '#34d399' : 'var(--text-muted)' }}>
              {userRating ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                  <CheckCircle2 size={12} /> {userRating}★
                </span>
              ) : 'Rate:'}
            </span>
          </div>

          <div
            className="star-rating"
            onMouseLeave={handleStarLeave}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={15}
                className="star-icon"
                color={displayRating >= star ? '#f59e0b' : '#374151'}
                fill={displayRating >= star ? '#f59e0b' : 'transparent'}
                onMouseEnter={(e) => handleStarHover(e, star)}
                onClick={(e) => handleStarClick(e, star)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
