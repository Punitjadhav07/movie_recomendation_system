import React, { useState } from 'react';
import { Star, CheckCircle2, TrendingUp } from 'lucide-react';

export default function MovieCard({ movie, onSelectMovie, onRateMovie, userRating }) {
  const [hoverRating, setHoverRating] = useState(0);
  const displayRating = hoverRating || userRating || 0;

  const handleStarClick = (e, val) => {
    e.stopPropagation();
    onRateMovie(movie.id, val, movie);
  };

  return (
    <div className="movie-card" onClick={() => onSelectMovie(movie)}>
      {/* Poster-free header: genre-colored accent */}
      <div className="card-genre-accent">
        {movie.genres?.slice(0, 2).map(g => (
          <span key={g} className="genre-pill">{g}</span>
        ))}
      </div>

      <div className="card-body">
        <h3 className="card-title" title={movie.title}>{movie.title}</h3>

        <div className="card-meta">
          <span>{movie.year}</span>
          {movie.vote_count != null && (
            <>
              <span>•</span>
              <span>{movie.vote_count.toLocaleString()} ratings</span>
            </>
          )}
          {movie.rating != null && (
            <>
              <span>•</span>
              <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <Star size={11} fill="#fbbf24" />{movie.rating.toFixed(1)}
              </span>
            </>
          )}
        </div>

        {/* Predicted rating badge (only on For You tab) */}
        {movie.predicted_rating != null && (
          <div className="predicted-badge">
            <TrendingUp size={12} />
            <span>Predicted: {movie.predicted_rating.toFixed(1)}★</span>
          </div>
        )}

        {/* Star rating input */}
        <div className="card-user-rate">
          <span className="rate-label">
            {userRating ? (
              <span className="rated-label">
                <CheckCircle2 size={12} /> {userRating}★ rated
              </span>
            ) : 'Rate:'}
          </span>
          <div className="star-rating" onMouseLeave={() => setHoverRating(0)}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={15}
                className="star-icon"
                color={displayRating >= star ? '#f59e0b' : '#374151'}
                fill={displayRating >= star ? '#f59e0b' : 'transparent'}
                onMouseEnter={(e) => { e.stopPropagation(); setHoverRating(star); }}
                onClick={(e) => handleStarClick(e, star)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
