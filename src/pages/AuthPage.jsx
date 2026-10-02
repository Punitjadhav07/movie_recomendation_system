import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Film, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AuthPage() {
  const { loginWithCredentials, signupWithCredentials, loginWithGoogle, user, role } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!username.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await loginWithCredentials(username.trim(), password);
        if (!res.success) {
          setError(res.error || 'Invalid credentials');
        }
      } else {
        const res = await signupWithCredentials(username.trim(), password);
        if (res.success) {
          setSuccessMsg('Account created successfully! Logging you in...');
        } else {
          setError(res.error || 'Failed to create account');
        }
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (userType) => {
    setIsLogin(true);
    setError('');
    setSuccessMsg('');
    if (userType === 'user') {
      setUsername('user1');
      setPassword('password@123');
    } else if (userType === 'admin') {
      setUsername('admin');
      setPassword('admin@123');
    }
  };

  return (
    <div className="auth-fullscreen-container">
      {/* Background Ambience */}
      <div className="auth-background-grid"></div>

      <div className="auth-card-wrapper">
        {/* Brand Logo Header */}
        <div className="auth-brand-header">
          <div className="auth-brand-icon">
            <Film size={28} color="#ffffff" />
          </div>
          <h1 className="auth-brand-title">
            Cine<span>Match</span>
          </h1>
          <p className="auth-brand-subtitle">
            AI & Collaborative Filtering Recommendation Engine
          </p>
        </div>

        {/* Tab Switcher: Login / Sign Up */}
        <div className="auth-tab-group">
          <button
            type="button"
            className={`auth-tab-btn ${isLogin ? 'active' : ''}`}
            onClick={() => {
              setIsLogin(true);
              setError('');
              setSuccessMsg('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${!isLogin ? 'active' : ''}`}
            onClick={() => {
              setIsLogin(false);
              setError('');
              setSuccessMsg('');
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Quick Fill Credentials Banner */}
        <div className="auth-preset-hints">
          <span className="preset-label">Test Credentials:</span>
          <div className="preset-badges">
            <button
              type="button"
              className="preset-btn"
              onClick={() => fillCredentials('user')}
              title="Fill user1 / password@123"
            >
              <span className="preset-role">User:</span> user1
            </button>
            <button
              type="button"
              className="preset-btn admin"
              onClick={() => fillCredentials('admin')}
              title="Fill admin / admin@123"
            >
              <span className="preset-role">Admin:</span> admin
            </button>
          </div>
        </div>

        {/* Error / Success Notifications */}
        {error && (
          <div className="auth-alert error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-alert success">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="auth-form-body">
          <div className="auth-input-group">
            <label className="auth-input-label">Username</label>
            <div className="auth-input-wrapper">
              <User size={16} className="auth-input-icon" />
              <input
                type="text"
                placeholder={isLogin ? "e.g. user1 or admin" : "Choose a username"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="auth-text-input"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label className="auth-input-label">Password</label>
            <div className="auth-input-wrapper">
              <Lock size={16} className="auth-input-icon" />
              <input
                type="password"
                placeholder={isLogin ? "Enter your password" : "Min. 6 characters"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-text-input"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
              />
            </div>
          </div>

          {!isLogin && (
            <div className="auth-input-group">
              <label className="auth-input-label">Confirm Password</label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="auth-text-input"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-auth-submit"
          >
            {loading ? (
              <span className="auth-spinner-text">Processing...</span>
            ) : isLogin ? (
              'Sign In to CineMatch'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={loginWithGoogle}
          className="btn btn-google-auth"
        >
          <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 17C3.7 20.7 7.5 23.5 12 23.5z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Footer info */}
        <div className="auth-footer-text">
          {isLogin ? (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                className="auth-link-inline"
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                }}
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button
                type="button"
                className="auth-link-inline"
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                }}
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
