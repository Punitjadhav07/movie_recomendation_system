import React from 'react';
import { Film, Star, User, Search, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  ratedCount,
  onOpenTasteProfile,
  onOpenQuickRate,
  backendAvailable,
  onLogout,
}) {
  const { user, role, logout: ctxLogout } = useAuth();
  const logout = onLogout || ctxLogout;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Brand Logo */}
        <div className="brand-logo" onClick={() => setActiveTab('for-you')}>
          <div
            style={{
              background: 'rgba(0,0,0,0.8)',
              padding: '0.45rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(0,0,0,0.5)',
            }}
          >
            <Film size={20} color="#ffffff" />
          </div>
          <span>
            Cine<span style={{ color: '#ffffff', fontWeight: 800 }}>Match</span>
          </span>
          <span className="brand-badge">CF RecSys</span>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search movies, directors, genres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Nav Links */}
        <div className="nav-links">
          <button
            className={`nav-btn ${activeTab === 'for-you' ? 'active' : ''}`}
            onClick={() => setActiveTab('for-you')}
          >
            <Film size={16} />
            <span>For You</span>
          </button>

          <button
            className={`nav-btn ${activeTab === 'top-rated' ? 'active' : ''}`}
            onClick={() => setActiveTab('top-rated')}
          >
            <Star size={16} />
            <span>Top Rated</span>
          </button>

          <button
            className={`nav-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <Film size={16} />
            <span>Catalog</span>
          </button>

          <button
            className={`nav-btn ${activeTab === 'my-ratings' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-ratings')}
          >
            <Star size={16} color="#f59e0b" />
            <span>My Ratings ({ratedCount})</span>
          </button>
        </div>

        {/* User Status / Role Pill */}
        {user && (
          <div className="navbar-user-chip">
            <div className="user-role-indicator">
              {role === 'admin' ? (
                <span className="badge-role admin"><Shield size={12} /> Admin</span>
              ) : (
                <span className="badge-role user"><User size={12} /> User</span>
              )}
            </div>
            {role === 'admin' && (
              <button
                className="btn-admin-link"
                onClick={() => { window.location.hash = '#admin'; }}
                title="Admin Panel"
              >
                <Shield size={12} /> Admin
              </button>
            )}
            <span className="user-name-label">{user.username || user.name || 'Account'}</span>
            <button className="btn-logout-icon" onClick={logout} title="Sign out of account">
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
