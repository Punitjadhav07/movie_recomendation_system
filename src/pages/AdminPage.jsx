import React, { useState, useEffect, useCallback } from 'react';
import { fetchAdminStats, fetchHealth, searchMovies } from '../services/mlApi';
import {
  LayoutDashboard, Database, Brain, BarChart3, Film, Activity,
  RefreshCw, Search, ChevronRight, AlertTriangle, CheckCircle,
  XCircle, ArrowLeft, Star, Users, Hash, Clock, Loader
} from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'dataset', label: 'Dataset', icon: Database },
  { id: 'engine', label: 'Rec Engine', icon: Brain },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
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
      <div className="admin-stat-val">{value ?? '—'}</div>
      <div className="admin-stat-label">{label}</div>
      {sub && <div className="admin-stat-sub">{sub}</div>}
    </div>
  );
}

export default function AdminPage({ onBack }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Admin API key — stored in sessionStorage only (never bundled, cleared on tab close)
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem('cinematch_admin_key') || '');
  const [keyInput, setKeyInput] = useState('');
  const [authFailed, setAuthFailed] = useState(false);

  // Catalog search
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogResults, setCatalogResults] = useState([]);
  const [catalogSearching, setCatalogSearching] = useState(false);

  const loadData = useCallback(async (key) => {
    setLoading(true);
    setError(null);
    setAuthFailed(false);
    const [statsRes, healthRes] = await Promise.all([
      fetchAdminStats(key),
      fetchHealth(),
    ]);
    if (statsRes.error) {
      if (statsRes.error.includes('403') || statsRes.error.includes('Invalid admin') ||
          statsRes.error.includes('503') || statsRes.error.includes('not configured')) {
        setAuthFailed(true);
        setAdminKey('');
        sessionStorage.removeItem('cinematch_admin_key');
      }
      setError(statsRes.error);
    } else {
      setStats(statsRes.data);
    }
    if (healthRes.data) setHealth(healthRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (adminKey) {
      loadData(adminKey);
    } else {
      setLoading(false);
      setAuthFailed(true);
    }
  }, [adminKey, loadData]);

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

  const handleKeySubmit = (e) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    sessionStorage.setItem('cinematch_admin_key', keyInput.trim());
    setAdminKey(keyInput.trim());
    setKeyInput('');
  };

  // Show key prompt if not authenticated with backend
  if (authFailed && !loading) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <div className="admin-header-left">
            <button className="admin-back-btn" onClick={onBack}>
              <ArrowLeft size={16} /> Back to App
            </button>
            <div>
              <h1 className="admin-title">CineMatch Admin</h1>
              <p className="admin-subtitle">Backend authorization required</p>
            </div>
          </div>
        </div>
        <div className="admin-info-card" style={{ maxWidth: 480 }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Enter the admin API key to access the admin dashboard. This key is set on the backend
            via the <code style={{ fontSize: '0.78rem' }}>CINEMATCH_ADMIN_KEY</code> environment variable.
          </p>
          {error && (
            <div className="backend-warning" style={{ marginBottom: '0.75rem' }}>
              <AlertTriangle size={14} />
              <span style={{ fontSize: '0.8rem' }}>{error}</span>
            </div>
          )}
          <form onSubmit={handleKeySubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Admin API key"
              className="admin-search-input"
              style={{
                flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)', padding: '0.55rem 0.85rem',
              }}
            />
            <button type="submit" className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
              Authenticate
            </button>
          </form>
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
        <button className="btn btn-secondary" onClick={() => loadData(adminKey)} style={{ fontSize: '0.78rem' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {error && (
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
        <StatCard label="Dataset Users" value={stats.dataset_users?.toLocaleString()} icon={Users} />
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
          <span>{stats.model?.k ?? '—'}</span>
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
          <span>{model?.k ?? '—'}</span>
        </div>
        <div className="admin-info-row">
          <span>Movies in Model</span>
          <span>{model?.n_movies?.toLocaleString() ?? '—'}</span>
        </div>
        <div className="admin-info-row">
          <span>Users in Model</span>
          <span>{model?.n_users?.toLocaleString() ?? '—'}</span>
        </div>
        <div className="admin-info-row">
          <span>Ratings Used</span>
          <span>{model?.n_ratings?.toLocaleString() ?? '—'}</span>
        </div>
        <div className="admin-info-row">
          <span>Matrix Density</span>
          <span>{model?.matrix_density_pct != null ? `${model.matrix_density_pct}%` : '—'}</span>
        </div>
        <div className="admin-info-row">
          <span>Explained Variance</span>
          <span>{model?.explained_variance_ratio != null ? `${(model.explained_variance_ratio * 100).toFixed(1)}%` : '—'}</span>
        </div>
        <div className="admin-info-row">
          <span>Training Time</span>
          <span>{model?.training_time_s != null ? `${model.training_time_s}s` : '—'}</span>
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

  // Find max for bar scaling
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
                <span>{m.vote_count?.toLocaleString() ?? '—'}</span>
                <span>{m.rating != null ? `${m.rating}` : '—'}</span>
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

// --- Catalog Tab ---
function CatalogTab({ query, setQuery, results, searching, stats }) {
  return (
    <div>
      <h2 className="admin-section-title">Movie Catalog Search</h2>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Search across all {stats?.total_movies_csv?.toLocaleString() || '—'} movies in the dataset.
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
                <span>{m.year || '—'}</span>
                <span className="admin-table-genres">{(m.genres || []).join(', ')}</span>
                <span>{m.vote_count?.toLocaleString() ?? '—'}</span>
                <span>{m.rating != null ? `${m.rating}` : '—'}</span>
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
