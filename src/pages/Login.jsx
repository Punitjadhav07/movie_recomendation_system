import React, { useState } from 'react';
import { getSupabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext.jsx';
import { Sparkles } from 'lucide-react';

export default function Login({ onSwitchToSignup }) {
  const supabase = getSupabase();
  const { logout } = useAuth(); // not used now, but keep context
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const email = `${username}@example.com`;
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) setError(signInErr.message);
    setLoading(false);
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">CineMatch Login</h2>
        {error && <p className="auth-error">{error}</p>}
        <form onSubmit={handleLogin} className="auth-form">
          <label>Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <div className="separator">or</div>
        <button onClick={handleGoogle} className="btn-google">
          <Sparkles size={16} /> Sign in with Google
        </button>
        <p className="switch-link">
          New here?{' '}
          <span className="link" onClick={onSwitchToSignup}>Create an account</span>
        </p>
      </div>
    </div>
  );
}
