import React from 'react';
import { X, User, BarChart2, Star, Sparkles, Brain, CheckCircle, RefreshCw } from 'lucide-react';
import { calculateTasteProfile } from '../services/recommendationEngine';

export default function TasteProfileModal({
  userRatings,
  allMovies,
  onClose,
  onResetRatings
}) {
  const profile = calculateTasteProfile(userRatings, allMovies);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              background: 'rgba(79, 70, 229, 0.2)',
              border: '1px solid rgba(79, 70, 229, 0.4)',
              padding: '0.45rem',
              borderRadius: '8px'
            }}>
              <Brain size={18} color="#818cf8" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>Taste Profile & CF Analytics</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Vector weights calculated from your real-time rating history
              </p>
            </div>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Archetype Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #172554 100%)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Taste Persona
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', fontFamily: 'Outfit, sans-serif' }}>
                {profile.archetype}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#c7d2fe', marginTop: '0.2rem' }}>
                {profile.totalRated >= 3 
                  ? `Calibrated across ${profile.totalRated} ratings with strong predictive confidence.`
                  : 'Needs at least 3 ratings for optimal collaborative filtering accuracy.'}
              </div>
            </div>

            <Sparkles size={32} color="#fbbf24" />
          </div>

          {/* Key Metrics */}
          <div className="stat-grid">
            <div className="stat-box">
              <div className="stat-val">{profile.totalRated}</div>
              <div className="stat-lbl">Movies Rated</div>
            </div>
            <div className="stat-box">
              <div className="stat-val">{profile.avgRating}★</div>
              <div className="stat-lbl">Average Rating</div>
            </div>
            <div className="stat-box">
              <div className="stat-val" style={{ color: '#10b981' }}>
                {profile.topGenres[0]?.genre || 'Diverse'}
              </div>
              <div className="stat-lbl">Top Affinity Genre</div>
            </div>
          </div>

          {/* Genre Preferences Breakdown */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BarChart2 size={15} color="#818cf8" />
              Genre Preference Distribution
            </h4>

            {profile.topGenres.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {profile.topGenres.map((item) => (
                  <div key={item.genre}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{item.genre}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.count} rated ({item.percentage}%)</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-card)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.percentage}%`, height: '100%', background: 'linear-gradient(90deg, #4f46e5, #3b82f6)', borderRadius: '999px' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                No rating data yet. Rate a few movies to see your preference graph!
              </p>
            )}
          </div>

          {/* Collaborative Filtering Algorithm Explanation */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: '0.82rem',
            color: '#cbd5e1',
            lineHeight: 1.6
          }}>
            <div style={{ fontWeight: 600, color: '#ffffff', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={14} color="#f59e0b" /> How the Recommendation Engine Works
            </div>
            When you rate movies, CineMatch constructs a sparse vector of your ratings and computes:
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.4rem', color: '#94a3b8' }}>
              <li><strong>Item-Item Cosine Similarity:</strong> Correlates genres, directors, and keywords of movies you enjoyed.</li>
              <li><strong>User-User Neighbor Prediction:</strong> Identifies synthetic taste twins in the community dataset to recommend unrated gems.</li>
            </ul>
          </div>

          {/* Reset Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              className="btn btn-secondary"
              onClick={onResetRatings}
              style={{ fontSize: '0.82rem', color: '#f87171' }}
            >
              <RefreshCw size={14} />
              Reset All Ratings
            </button>
            <button className="btn btn-primary" onClick={onClose} style={{ fontSize: '0.82rem' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
