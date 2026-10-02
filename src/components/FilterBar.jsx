import React from 'react';
import { GENRES } from '../data/mockMovies';
import { SlidersHorizontal } from 'lucide-react';

const FILTER_GENRES = ['All', ...GENRES.filter(g => g !== 'All')];

export default function FilterBar({
  selectedGenres,
  setSelectedGenres,
  sortBy,
  setSortBy,
  minRating,
  setMinRating
}) {
  const toggleGenre = (genre) => {
    if (genre === 'All') {
      setSelectedGenres(['__all__']);
      return;
    }
    setSelectedGenres((prev) => {
      // Remove sentinel values
      const current = (prev || []).filter(g => g !== '__all__' && g !== 'All');
      if (current.includes(genre)) {
        const next = current.filter(g => g !== genre);
        return next.length === 0 ? ['__all__'] : next;
      }
      return [...current, genre];
    });
  };

  // A genre pill is "active" if it's in selectedGenres (ignoring sentinel)
  const activeGenres = (selectedGenres || []).filter(g => g !== '__all__' && g !== 'All');
  const isAllActive = activeGenres.length === 0;

  return (
    <div className="filter-bar">
      {/* Genre Pills */}
      <div className="genre-chips-scroll">
        <button
          className={`genre-chip ${isAllActive ? 'active' : ''}`}
          onClick={() => setSelectedGenres(['__all__'])}
        >
          All
        </button>
        {GENRES.filter(g => g !== 'All').map((genre) => (
          <button
            key={genre}
            className={`genre-chip ${activeGenres.includes(genre) ? 'active' : ''}`}
            onClick={() => toggleGenre(genre)}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Sorting & Filter Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <SlidersHorizontal size={14} color="#9ca3af" />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sort by:</span>
          <select
            className="filter-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="match">Collaborative Match (Highest)</option>
            <option value="rating">IMDb / Community Rating</option>
            <option value="year_desc">Newest Release</option>
            <option value="year_asc">Classic / Oldest</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Min Rating:</span>
          <select
            className="filter-sort-select"
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
          >
            <option value="0">All Ratings</option>
            <option value="4.5">4.5★ &amp; Above</option>
            <option value="4.8">4.8★ Top Tier</option>
          </select>
        </div>
      </div>
    </div>
  );
}
