import React, { useState } from 'react';
import { Sparkles, Check } from 'lucide-react';

const ALL_GENRES = [
  { name: 'Action',    emoji: '💥', desc: 'High-octane thrills' },
  { name: 'Adventure', emoji: '🌍', desc: 'Epic journeys' },
  { name: 'Animation', emoji: '🎨', desc: 'Animated worlds' },
  { name: 'Comedy',    emoji: '😂', desc: 'Laugh out loud' },
  { name: 'Crime',     emoji: '🔍', desc: 'Dark underworlds' },
  { name: 'Drama',     emoji: '🎭', desc: 'Deep storytelling' },
  { name: 'Fantasy',   emoji: '🧙', desc: 'Magical realms' },
  { name: 'Horror',    emoji: '👻', desc: 'Spine-chilling fear' },
  { name: 'Mystery',   emoji: '🕵️', desc: 'Whodunit puzzles' },
  { name: 'Romance',   emoji: '❤️', desc: 'Love stories' },
  { name: 'Sci-Fi',    emoji: '🚀', desc: 'Future frontiers' },
  { name: 'Thriller',  emoji: '⚡', desc: 'Edge-of-seat tension' },
  { name: 'History',   emoji: '📜', desc: 'Past civilizations' },
  { name: 'Music',     emoji: '🎵', desc: 'Rhythm & soul' },
  { name: 'War',       emoji: '🪖', desc: 'Battlefield sagas' },
  { name: 'Western',   emoji: '🤠', desc: 'Wild west tales' },
];

export default function GenreSelection({ onSave }) {
  const [selected, setSelected] = useState([]);

  const toggleGenre = (genre) => {
    setSelected((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleContinue = () => {
    const toSave = selected.length > 0 ? selected : ALL_GENRES.map(g => g.name);
    localStorage.setItem('cinematch_user_genres', JSON.stringify(toSave));
    if (onSave) onSave(toSave);
  };

  return (
    <div className="genre-modal-overlay">
      <div className="genre-modal">
        {/* Header */}
        <div className="genre-modal-header">
          <div className="genre-modal-icon">
            <Sparkles size={28} color="#ffffff" />
          </div>
          <h1 className="genre-modal-title">What do you love watching?</h1>
          <p className="genre-modal-subtitle">
            Pick your favourite genres and we'll personalise your recommendations using our SVD model.
          </p>
          {selected.length > 0 && (
            <div className="genre-modal-badge">
              {selected.length} genre{selected.length > 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* Genre Grid */}
        <div className="genre-card-grid">
          {ALL_GENRES.map(({ name, emoji, desc }) => {
            const isSelected = selected.includes(name);
            return (
              <button
                key={name}
                type="button"
                className={`genre-card ${isSelected ? 'genre-card--selected' : ''}`}
                onClick={() => toggleGenre(name)}
              >
                {isSelected && (
                  <div className="genre-card-check">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
                <span className="genre-card-emoji">{emoji}</span>
                <span className="genre-card-name">{name}</span>
                <span className="genre-card-desc">{desc}</span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="genre-modal-footer">
          <p className="genre-modal-skip-hint">
            Skip to browse all movies without personalisation
          </p>
          <div className="genre-modal-actions">
            <button
              type="button"
              className="btn-genre-skip"
              onClick={() => { onSave([]); }}
            >
              Skip for now
            </button>
            <button
              type="button"
              className="btn-genre-continue"
              onClick={handleContinue}
            >
              <Sparkles size={16} />
              {selected.length > 0
                ? `Continue with ${selected.length} genre${selected.length > 1 ? 's' : ''}`
                : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
