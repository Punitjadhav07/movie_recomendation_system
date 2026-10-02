import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchAdminStats, fetchHealth, searchMovies,
  fetchAdminUsers, fetchAdminUserDetail, changeUserRole
} from '../services/mlApi';
import {
  LayoutDashboard, Database, Brain, BarChart3, Film, Activity,
  RefreshCw, Search, AlertTriangle, CheckCircle,
  XCircle, ArrowLeft, Star, Users, Hash, Clock, Loader,
  User, ChevronLeft, Shield
} from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'dataset', label: 'Dataset', icon: Database },
  { id: 'engine', label: 'Rec Engine', icon: Brain },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'catalog', label: 'Movie Catalog', icon: Film },
  { id: 'health', label: 'System Health', icon: Activity },
];

function StatusDot({ ok }) {
  return (
    <span
      className="admin-status-dot"
      style={{ background: ok ? '#10b981' : '#ef4444' }}
    />
  );
}

function StatCard({ label, value, sub, icon: Icon }) {
  return (
    <div className="admin-stat-card">
      {Icon && <Icon size={18} className="admin-stat-icon" />}
      <div className="admin-stat-val">{value ?? '--'}</div>
      <div className="admin-stat-label">{label}</div>
      {sub && <div className="admin-stat-sub">{sub}</div>}
    </div>
  );
}

export default function AdminPage({ onBack }) {
  const { authToken } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authError, setAuthError] = useState(false);

  // Catalog search
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogResults, setCatalogResults] = useState([]);
  const [catalogSearching, setCatalogSearching] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAuthError(false);

    if (!authToken) {
      setAuthError(true);
      setLoading(false);
      return;
    }

    const [statsRes, healthRes] = await Promise.all([
      fetchAdminStats(authToken),
      fetchHealth(),
    ]);
    if (statsRes.error) {
      if (statsRes.error.includes('401') || statsRes.error.includes('Authentication required') ||
          statsRes.error.includes('Invalid or expired') || statsRes.error.includes('403') ||
          statsRes.error.includes('Admin access required')) {
        setAuthError(true);
      }
      setError(statsRes.error);
    } else {
      setStats(statsRes.data);
    }
    if (healthRes.data) setHealth(healthRes.data);
    setLoading(false);
  }, [authToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Catalog search handler
  useEffect(() => {
    if (!catalogQuery.trim()) { setCatalogResults([]); return; }
    const t = setTimeout(async () => {
      setCatalogSearching(true);
      const { data } = await searchMovies(catalogQuery, 30);
      setCatalogResults(data?.movies || []);
      setCatalogSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [catalogQuery]);

  // Auth error: session expired or no token
  if (authError && !loading) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <div className="admin-header-left">
            <button className="admin-back-btn" onClick={onBack}>
              <ArrowLeft size={16} /> Back to App
            </button>
            <div>
              <h1 className="admin-title">CineMatch Admin</h1>
              <p className="admin-subtitle">Authentication required</p>
            </div>
          </div>
        </div>
        <div className="admin-info-card" style={{ maxWidth: 480 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <AlertTriangle size={18} color="#f59e0b" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Session expired or unauthorized</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Your admin session is no longer valid. Please log out and log back in with admin credentials
            to access the admin dashboard.
          </p>
          {error && (
            <div className="backend-warning" style={{ marginBottom: '0.75rem' }}>
              <AlertTriangle size={14} />
              <span style={{ fontSize: '0.8rem' }}>{error}</span>
            </div>
          )}
          <button className="btn btn-primary" onClick={onBack} style={{ fontSize: '0.82rem' }}>
            Back to App
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          <Loader size={28} className="spin" />
          <span>Loading admin data...</span>
        </div>
      </div>
    );
  }

  const model = stats?.model || {};
  const evalMetrics = stats?.evaluation;

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-left">
          <button className="admin-back-btn" onClick={onBack}>
            <ArrowLeft size={16} /> Back to App
          </button>
          <div>
            <h1 className="admin-title">CineMatch Admin</h1>
            <p className="admin-subtitle">Operations & System Management</p>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={loadData} style={{ fontSize: '0.78rem' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {error && !authError && (
        <div className="backend-warning" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={16} />
          <span>Backend error: {error}</span>
        </div>
      )}

      {/* Tab navigation */}
      <div className="admin-tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`admin-tab-btn ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={15} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="admin-content">
        {activeTab === 'dashboard' && <DashboardTab stats={stats} health={health} />}
        {activeTab === 'dataset' && <DatasetTab stats={stats} />}
        {activeTab === 'engine' && <EngineTab model={model} evalMetrics={evalMetrics} stats={stats} />}
        {activeTab === 'analytics' && <AnalyticsTab stats={stats} />}
        {activeTab === 'users' && <UserManagementTab authToken={authToken} />}
        {activeTab === 'catalog' && (
          <CatalogTab
            query={catalogQuery}
            setQuery={setCatalogQuery}
            results={catalogResults}
            searching={catalogSearching}
            stats={stats}
          />
        )}
        {activeTab === 'health' && <HealthTab health={health} stats={stats} />}
      </div>
    </div>
  );
}

// --- Dashboard Tab ---
function DashboardTab({ stats, health }) {
  if (!stats) return <EmptyNotice msg="No data available. Is the backend running?" />;
  return (
    <div>
      <h2 className="admin-section-title">System Overview</h2>
      <div className="admin-stat-grid">
        <StatCard label="Total Movies (CSV)" value={stats.total_movies_csv?.toLocaleString()} icon={Film} />
        <StatCard label="SVD Catalog" value={stats.catalog_movies?.toLocaleString()} icon={Hash} sub="Top movies by vote count" />
        <StatCard label="App Users" value={stats.app_users?.toLocaleString()} icon={Users} sub={`${stats.admin_users || 0} admin(s)`} />
        <StatCard label="Dataset Users" value={stats.dataset_users?.toLocaleString()} icon={Users} sub="ML training data" />
        <StatCard label="Dataset Ratings" value={stats.dataset_ratings?.toLocaleString()} icon={Star} />
        <StatCard label="SVD Embeddings" value={stats.svd_embeddings?.toLocaleString()} icon={Brain} />
        <StatCard label="Session Ratings" value={stats.session_ratings?.toLocaleString()} icon={Activity} sub={`${stats.session_users || 0} session user(s)`} />
      </div>

      <h2 className="admin-section-title" style={{ marginTop: '1.5rem' }}>Model Status</h2>
      <div className="admin-info-card">
        <div className="admin-info-row">
          <span>Algorithm</span>
          <span>{stats.model?.algorithm || 'Not loaded'}</span>
        </div>
        <div className="admin-info-row">
          <span>Latent Factors (k)</span>
          <span>{stats.model?.k ?? '--'}</span>
        </div>
        <div className="admin-info-row">
          <span>Last Trained</span>
          <span>{stats.model?.timestamp || 'Unknown'}</span>
        </div>
        <div className="admin-info-row">
          <span>Backend Status</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <StatusDot ok={!!health} />
            {health ? 'Healthy' : 'Unavailable'}
          </span>
        </div>
      </div>
    </div>
  );
}

// --- Dataset Tab ---
function DatasetTab({ stats }) {
  if (!stats) return <EmptyNotice msg="No data available." />;
  const files = stats.data_files || {};
  return (
    <div>
      <h2 className="admin-section-title">Dataset Statistics</h2>
      <div className="admin-stat-grid">
        <StatCard label="Movies (CSV)" value={stats.total_movies_csv?.toLocaleString()} icon={Film} />
        <StatCard label="SVD Catalog" value={stats.catalog_movies?.toLocaleString()} icon={Hash} />
        <StatCard label="Dataset Users" value={stats.dataset_users?.toLocaleString()} icon={Users} />
        <StatCard label="Dataset Ratings" value={stats.dataset_ratings?.toLocaleString()} icon={Star} />
      </div>

      <h2 className="admin-section-title" style={{ marginTop: '1.5rem' }}>Data Files</h2>
      <div className="admin-info-card">
        {Object.entries(files).map(([path, exists]) => (
          <div className="admin-info-row" key={path}>
            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{path}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {exists ? <CheckCircle size={14} color="#10b981" /> : <XCircle size={14} color="#ef4444" />}
              {exists ? 'Present' : 'Missing'}
            </span>
          </div>
        ))}
      </div>

      <h2 className="admin-section-title" style={{ marginTop: '1.5rem' }}>Processing</h2>
      <div className="admin-info-card">
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Dataset ingestion and model training are run from the command line. The backend does not support
          triggering these operations remotely.
        </p>
        <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <code style={{ display: 'block', marginBottom: '0.3rem' }}>venv/bin/python scripts/ingest_movie_lens.py</code>
          <code style={{ display: 'block', marginBottom: '0.3rem' }}>venv/bin/python ml/train_svd.py</code>
          <code style={{ display: 'block' }}>venv/bin/python ml/evaluate_model.py</code>
        </div>
      </div>
    </div>
  );
}

// --- Engine Tab ---
function EngineTab({ model, evalMetrics, stats }) {
  return (
    <div>
      <h2 className="admin-section-title">Recommendation Engine</h2>
      <div className="admin-info-card">
        <div className="admin-info-row">
          <span>Current Model</span>
          <span>{model?.algorithm || 'Not loaded'}</span>
        </div>
        <div className="admin-info-row">
          <span>Latent Factors (k)</span>
          <span>{model?.k ?? '--'}</span>
        </div>
        <div className="admin-info-row">
          <span>Movies in Model</span>
          <span>{model?.n_movies?.toLocaleString() ?? '--'}</span>
        </div>
        <div className="admin-info-row">
          <span>Users in Model</span>
          <span>{model?.n_users?.toLocaleString() ?? '--'}</span>
        </div>
        <div className="admin-info-row">
          <span>Ratings Used</span>
          <span>{model?.n_ratings?.toLocaleString() ?? '--'}</span>
        </div>
        <div className="admin-info-row">
          <span>Matrix Density</span>
          <span>{model?.matrix_density_pct != null ? `${model.matrix_density_pct}%` : '--'}</span>
        </div>
        <div className="admin-info-row">
          <span>Explained Variance</span>
          <span>{model?.explained_variance_ratio != null ? `${(model.explained_variance_ratio * 100).toFixed(1)}%` : '--'}</span>
        </div>
        <div className="admin-info-row">
          <span>Training Time</span>
          <span>{model?.training_time_s != null ? `${model.training_time_s}s` : '--'}</span>
        </div>
        <div className="admin-info-row">
          <span>Last Trained</span>
          <span>{model?.timestamp || 'Unknown'}</span>
        </div>
      </div>

      <h2 className="admin-section-title" style={{ marginTop: '1.5rem' }}>Evaluation Metrics</h2>
      {evalMetrics ? (
        <>
          <div className="admin-stat-grid">
            <StatCard label="RMSE" value={evalMetrics.rmse} sub="Lower is better" />
            <StatCard label="MAE" value={evalMetrics.mae} sub="Lower is better" />
            <StatCard label="Precision@10" value={evalMetrics.precision_at_10} sub="Fraction of top-10 relevant" />
            <StatCard label="Recall@10" value={evalMetrics.recall_at_10} sub="Fraction of relevant found" />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Evaluated at {evalMetrics.evaluated_at} | {evalMetrics.rmse_eval_pairs} hold-out pairs | {evalMetrics.precision_eval_users} precision/recall users
          </div>
        </>
      ) : (
        <div className="admin-info-card">
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            No evaluation metrics found. Run the evaluation script:
          </p>
          <code style={{ fontSize: '0.78rem', display: 'block', marginTop: '0.5rem' }}>
            venv/bin/python ml/evaluate_model.py
          </code>
        </div>
      )}

      <h2 className="admin-section-title" style={{ marginTop: '1.5rem' }}>Retraining</h2>
      <div className="admin-info-card">
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Model retraining is a command-line operation. The backend does not support triggering retraining remotely.
        </p>
        <code style={{ fontSize: '0.78rem', display: 'block', marginTop: '0.5rem' }}>
          venv/bin/python ml/train_svd.py
        </code>
      </div>
    </div>
  );
}

// --- Analytics Tab ---
function AnalyticsTab({ stats }) {
  if (!stats) return <EmptyNotice msg="No analytics data available." />;

  const ratingDist = stats.rating_distribution || {};
  const genreDist = stats.genre_distribution || {};
  const mostRated = stats.most_rated_movies || [];

  const maxRatingCount = Math.max(...Object.values(ratingDist), 1);
  const maxGenreCount = Math.max(...Object.values(genreDist), 1);

  return (
    <div>
      <h2 className="admin-section-title">Rating Distribution</h2>
      <div className="admin-info-card">
        {Object.entries(ratingDist).length > 0 ? (
          <div className="admin-bar-chart">
            {Object.entries(ratingDist).map(([rating, count]) => (
              <div key={rating} className="admin-bar-row">
                <span className="admin-bar-label">{rating}</span>
                <div className="admin-bar-track">
                  <div
                    className="admin-bar-fill"
                    style={{ width: `${(count / maxRatingCount) * 100}%` }}
                  />
                </div>
                <span className="admin-bar-count">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No rating data available.</p>
        )}
      </div>

      <h2 className="admin-section-title" style={{ marginTop: '1.5rem' }}>Genre Distribution (Catalog)</h2>
      <div className="admin-info-card">
        {Object.entries(genreDist).length > 0 ? (
          <div className="admin-bar-chart">
            {Object.entries(genreDist).map(([genre, count]) => (
              <div key={genre} className="admin-bar-row">
                <span className="admin-bar-label" style={{ minWidth: '100px' }}>{genre}</span>
                <div className="admin-bar-track">
                  <div
                    className="admin-bar-fill admin-bar-fill--genre"
                    style={{ width: `${(count / maxGenreCount) * 100}%` }}
                  />
                </div>
                <span className="admin-bar-count">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No genre data available.</p>
        )}
      </div>

      <h2 className="admin-section-title" style={{ marginTop: '1.5rem' }}>Most Rated Movies</h2>
      <div className="admin-info-card">
        {mostRated.length > 0 ? (
          <div className="admin-movie-table">
            <div className="admin-table-header">
              <span>ID</span>
              <span>Title</span>
              <span>Votes</span>
              <span>Avg Rating</span>
            </div>
            {mostRated.map((m) => (
              <div key={m.id} className="admin-table-row">
                <span className="admin-table-id">{m.id}</span>
                <span className="admin-table-title">{m.title}</span>
                <span>{m.vote_count?.toLocaleString() ?? '--'}</span>
                <span>{m.rating != null ? `${m.rating}` : '--'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No data available.</p>
        )}
      </div>
    </div>
  );
}

// --- User Management Tab ---
function UserManagementTab({ authToken }) {
  const [usersData, setUsersData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [roleChanging, setRoleChanging] = useState(false);

  const loadUsers = useCallback(async (search = '') => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await fetchAdminUsers(authToken, search);
    if (err) {
      setError(err);
    } else {
      setUsersData(data);
    }
    setLoading(false);
  }, [authToken]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      loadUsers();
      return;
    }
    const t = setTimeout(() => loadUsers(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery, loadUsers]);

  const handleSelectUser = async (userId) => {
    setSelectedUser(userId);
    setDetailLoading(true);
    const { data, error: err } = await fetchAdminUserDetail(authToken, userId);
    if (data) setUserDetail(data);
    if (err) setError(err);
    setDetailLoading(false);
  };

  const handleRoleChange = async (userId, newRole) => {
    setRoleChanging(true);
    const { data, error: err } = await changeUserRole(authToken, userId, newRole);
    if (err) {
      setError(err);
    } else {
      // Reload users and detail
      loadUsers(searchQuery);
      if (selectedUser === userId) {
        handleSelectUser(userId);
      }
    }
    setRoleChanging(false);
  };

  const handleBackToList = () => {
    setSelectedUser(null);
    setUserDetail(null);
  };

  // User detail view
  if (selectedUser && userDetail) {
    return (
      <div>
        <button
          className="admin-back-btn"
          onClick={handleBackToList}
          style={{ marginBottom: '1rem' }}
        >
          <ChevronLeft size={16} /> Back to Users
        </button>

        <h2 className="admin-section-title">User Details</h2>
        <div className="admin-info-card">
          <div className="admin-info-row">
            <span>User ID</span>
            <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{userDetail.user_id}</span>
          </div>
          <div className="admin-info-row">
            <span>Username</span>
            <span>{userDetail.username}</span>
          </div>
          <div className="admin-info-row">
            <span>Name</span>
            <span>{userDetail.name}</span>
          </div>
          <div className="admin-info-row">
            <span>Role</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`admin-user-role-badge ${userDetail.role}`}>
                {userDetail.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                {userDetail.role}
              </span>
              {userDetail.source !== 'dataset' && userDetail.source !== 'session' && (
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => handleRoleChange(
                    userDetail.user_id,
                    userDetail.role === 'admin' ? 'user' : 'admin'
                  )}
                  disabled={roleChanging}
                >
                  {roleChanging ? '...' : `Change to ${userDetail.role === 'admin' ? 'user' : 'admin'}`}
                </button>
              )}
            </span>
          </div>
          <div className="admin-info-row">
            <span>Source</span>
            <span className={`admin-user-source-badge ${userDetail.source}`}>{userDetail.source}</span>
          </div>
          <div className="admin-info-row">
            <span>Created</span>
            <span>{userDetail.created_at || '--'}</span>
          </div>
          <div className="admin-info-row">
            <span>Total Ratings</span>
            <span>{userDetail.rating_count}</span>
          </div>
          <div className="admin-info-row">
            <span>Average Rating</span>
            <span>{userDetail.avg_rating != null ? `${userDetail.avg_rating} / 5.0` : '--'}</span>
          </div>
        </div>

        {/* Rating History */}
        <h2 className="admin-section-title" style={{ marginTop: '1.5rem' }}>
          Rating History ({userDetail.ratings?.length || 0} ratings)
        </h2>
        {userDetail.ratings && userDetail.ratings.length > 0 ? (
          <div className="admin-info-card">
            <div className="admin-movie-table admin-movie-table--wide">
              <div className="admin-table-header">
                <span>Movie ID</span>
                <span>Title</span>
                <span>Rating</span>
                <span>Genres</span>
              </div>
              {userDetail.ratings.map((r) => (
                <div key={r.movie_id} className="admin-table-row">
                  <span className="admin-table-id">{r.movie_id}</span>
                  <span className="admin-table-title">{r.title}</span>
                  <span>
                    <span className="admin-rating-stars">
                      {'*'.repeat(Math.round(r.rating))} {r.rating}
                    </span>
                  </span>
                  <span className="admin-table-genres">{(r.genres || []).join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="admin-info-card">
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No ratings recorded for this user.</p>
          </div>
        )}
      </div>
    );
  }

  // Loading detail
  if (selectedUser && detailLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <Loader size={24} className="spin" />
        <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Loading user details...</p>
      </div>
    );
  }

  const userStats = usersData?.stats || {};
  const users = usersData?.users || [];

  return (
    <div>
      <h2 className="admin-section-title">User Management</h2>

      {/* Stats */}
      <div className="admin-stat-grid">
        <StatCard label="App Users" value={userStats.total_app_users} icon={Users} />
        <StatCard label="Admin Users" value={userStats.admin_users} icon={Shield} />
        <StatCard label="Normal Users" value={userStats.normal_users} icon={User} />
        <StatCard label="With Ratings" value={userStats.users_with_ratings} icon={Star} />
        <StatCard label="Session Users" value={userStats.session_users} icon={Activity} sub="Active this session" />
        <StatCard label="Dataset Users" value={userStats.dataset_users} icon={Database} sub="ML training data" />
      </div>

      {/* Search */}
      <div className="admin-search-bar" style={{ marginTop: '1.5rem' }}>
        <Search size={16} color="#71717a" />
        <input
          type="text"
          placeholder="Search users by username or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="admin-search-input"
        />
        {loading && <Loader size={14} className="spin" />}
      </div>

      {error && (
        <div className="backend-warning" style={{ marginTop: '0.75rem' }}>
          <AlertTriangle size={14} />
          <span style={{ fontSize: '0.8rem' }}>{error}</span>
        </div>
      )}

      {/* User Table */}
      {users.length > 0 ? (
        <div className="admin-info-card" style={{ marginTop: '1rem' }}>
          <div className="admin-movie-table admin-movie-table--wide">
            <div className="admin-table-header">
              <span>User ID</span>
              <span>Username</span>
              <span>Role</span>
              <span>Source</span>
              <span>Ratings</span>
              <span>Avg</span>
              <span></span>
            </div>
            {users.map((u) => (
              <div key={u.user_id} className="admin-table-row admin-table-row--clickable" onClick={() => handleSelectUser(u.user_id)}>
                <span className="admin-table-id">{u.user_id}</span>
                <span className="admin-table-title">{u.username}</span>
                <span>
                  <span className={`admin-user-role-badge ${u.role}`}>
                    {u.role}
                  </span>
                </span>
                <span>
                  <span className={`admin-user-source-badge ${u.source}`}>{u.source}</span>
                </span>
                <span>{u.rating_count}</span>
                <span>{u.avg_rating != null ? u.avg_rating : '--'}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>View</span>
              </div>
            ))}
          </div>
        </div>
      ) : !loading ? (
        <div className="admin-info-card" style={{ marginTop: '1rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1rem' }}>
            {searchQuery ? `No users found matching "${searchQuery}"` : 'No users found.'}
          </p>
        </div>
      ) : null}

      {/* Dataset user lookup hint */}
      <div className="admin-info-card" style={{ marginTop: '1rem' }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Dataset users (u_1 through u_{userStats.dataset_users || '2000'}) are ML training data from MovieLens.
          They are not listed above but can be looked up individually by searching their ID.
        </p>
      </div>
    </div>
  );
}

// --- Catalog Tab ---
function CatalogTab({ query, setQuery, results, searching, stats }) {
  return (
    <div>
      <h2 className="admin-section-title">Movie Catalog Search</h2>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Search across all {stats?.total_movies_csv?.toLocaleString() || '--'} movies in the dataset.
      </p>

      <div className="admin-search-bar">
        <Search size={16} color="#71717a" />
        <input
          type="text"
          placeholder="Search movies by title..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="admin-search-input"
        />
        {searching && <Loader size={14} className="spin" />}
      </div>

      {results.length > 0 && (
        <div className="admin-info-card" style={{ marginTop: '1rem' }}>
          <div className="admin-movie-table admin-movie-table--wide">
            <div className="admin-table-header">
              <span>ID</span>
              <span>Title</span>
              <span>Year</span>
              <span>Genres</span>
              <span>Votes</span>
              <span>Rating</span>
            </div>
            {results.map((m) => (
              <div key={m.id} className="admin-table-row">
                <span className="admin-table-id">{m.id}</span>
                <span className="admin-table-title">{m.title}</span>
                <span>{m.year || '--'}</span>
                <span className="admin-table-genres">{(m.genres || []).join(', ')}</span>
                <span>{m.vote_count?.toLocaleString() ?? '--'}</span>
                <span>{m.rating != null ? `${m.rating}` : '--'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {query && !searching && results.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1rem' }}>
          No movies found for "{query}".
        </p>
      )}
    </div>
  );
}

// --- Health Tab ---
function HealthTab({ health, stats }) {
  const files = stats?.data_files || {};
  const checks = [
    { name: 'FastAPI Backend', ok: !!health, detail: health ? 'Responding' : 'Unavailable' },
    { name: 'SVD Model Loaded', ok: (stats?.svd_embeddings || 0) > 0, detail: stats?.svd_embeddings ? `${stats.svd_embeddings} embeddings` : 'Not loaded' },
    { name: 'Movie Catalog', ok: (stats?.catalog_movies || 0) > 0, detail: stats?.catalog_movies ? `${stats.catalog_movies} movies` : 'Empty' },
    { name: 'Dataset Users', ok: (stats?.dataset_users || 0) > 0, detail: stats?.dataset_users ? `${stats.dataset_users} users` : 'None loaded' },
    { name: 'movies.csv', ok: !!files['data/movies.csv'], detail: files['data/movies.csv'] ? 'Present' : 'Missing' },
    { name: 'ratings.csv', ok: !!files['data/ratings.csv'], detail: files['data/ratings.csv'] ? 'Present' : 'Missing' },
    { name: 'Processed Movies', ok: !!files['data/processed_movies.json'], detail: files['data/processed_movies.json'] ? 'Present' : 'Missing' },
    { name: 'Processed Ratings', ok: !!files['data/processed_ratings.json'], detail: files['data/processed_ratings.json'] ? 'Present' : 'Missing' },
  ];

  return (
    <div>
      <h2 className="admin-section-title">System Health</h2>
      <div className="admin-info-card">
        {checks.map((c) => (
          <div className="admin-info-row" key={c.name}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {c.ok
                ? <CheckCircle size={15} color="#10b981" />
                : <XCircle size={15} color="#ef4444" />
              }
              {c.name}
            </span>
            <span style={{ color: c.ok ? '#10b981' : '#ef4444' }}>{c.detail}</span>
          </div>
        ))}
      </div>

      {health && (
        <>
          <h2 className="admin-section-title" style={{ marginTop: '1.5rem' }}>Health Endpoint Response</h2>
          <div className="admin-info-card">
            <pre style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>
              {JSON.stringify(health, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyNotice({ msg }) {
  return (
    <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      <AlertTriangle size={24} style={{ marginBottom: '0.5rem' }} />
      <p>{msg}</p>
    </div>
  );
}
