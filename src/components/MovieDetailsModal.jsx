import React, { useEffect, useState } from 'react';
import { X, Star, Film, Loader } from 'lucide-react';
import { getSimilarMovies } from '../services/mlApi';

export default function MovieDetailsModal({ movie, onClose, onSelectMovie, onRateMovie, userRating }) {
  const [similar, setSimilar] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  useEffect(() => {
    if (!movie) return;
    setLoadingSimilar(true);
    getSimilarMovies(movie.id, 4).then(({ data }) => {
      setSimilar(data?.similar || []);
      setLoadingSimilar(false);
    });
  }, [movie?.id]);

  if (!movie) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>
              {movie.title}
              <span style={{ fontSize: '0.95rem', color: '#9ca3af', fontWeight: 400, marginLeft: '0.5rem' }}>
                ({movie.year})
              </span>
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.4rem' }}>
              {movie.genres?.map(g => (
                <span key={g} className="genre-pill">{g}</span>
              ))}
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {/* Stats */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {movie.rating != null && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#fbbf24', fontWeight: 600 }}>
                <Star size={14} fill="#fbbf24" /> {movie.rating.toFixed(2)} avg rating
              </span>
            )}
            {movie.vote_count != null && (
              <span>{movie.vote_count.toLocaleString()} community ratings</span>
            )}
            {movie.predicted_rating != null && (
              <span style={{ color: '#818cf8', fontWeight: 600 }}>
                Predicted for you: {movie.predicted_rating.toFixed(1)}★
              </span>
            )}
          </div>

          {/* Rate this movie */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>Your Rating</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {userRating ? `You rated this ${userRating}★` : 'Rate to improve your SVD recommendations'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  size={22}
                  className="star-icon"
                  color={userRating >= star ? '#f59e0b' : '#4b5563'}
                  fill={userRating >= star ? '#f59e0b' : 'transparent'}
                  onClick={() => onRateMovie(movie.id, star, movie)}
                />
              ))}
            </div>
          </div>

          {/* Similar movies (SVD latent space) */}
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Film size={14} color="#818cf8" />
              Similar Movies (SVD Latent Space)
            </h4>

            {loadingSimilar ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                <Loader size={14} className="spin" /> Loading…
              </div>
            ) : similar.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {similar.map(m => (
                  <div
                    key={m.id}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', cursor: 'pointer' }}
                    onClick={() => onSelectMovie(m)}
                  >
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>{m.title}</div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                        {m.year} • {m.genres?.slice(0, 2).join(', ')}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {Math.round(m.latent_similarity * 100)}% match
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                No SVD similarity data for this movie (not in recommendation catalog).
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
