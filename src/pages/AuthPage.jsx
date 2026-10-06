import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Film, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AuthPage() {
  const { loginWithCredentials, signupWithCredentials } = useAuth();
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
                placeholder={isLogin ? "Enter your username" : "Choose a username"}
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
