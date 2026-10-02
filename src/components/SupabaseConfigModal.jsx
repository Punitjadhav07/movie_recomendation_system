import React, { useState } from 'react';
import { X, Database, CheckCircle2, AlertCircle, Copy, Check, ExternalLink, Code } from 'lucide-react';
import { setSupabaseConfig, isSupabaseConnected, SUPABASE_SQL_SCHEMA } from '../services/supabaseClient';

export default function SupabaseConfigModal({ onClose, onConfigSaved }) {
  const [url, setUrl] = useState(localStorage.getItem('cinematch_supabase_url') || '');
  const [anonKey, setAnonKey] = useState(localStorage.getItem('cinematch_supabase_key') || '');
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [showSchema, setShowSchema] = useState(false);

  const isConnected = isSupabaseConnected();

  const handleSave = (e) => {
    e.preventDefault();
    if (!url || !anonKey) {
      setSupabaseConfig('', '');
      setStatusMsg('Switched to Local/Client-Side engine.');
      if (onConfigSaved) onConfigSaved();
      return;
    }

    const success = setSupabaseConfig(url.trim(), anonKey.trim());
    if (success) {
      setStatusMsg('Connected to Supabase project successfully!');
      if (onConfigSaved) onConfigSaved();
    } else {
      setStatusMsg('Failed to initialize Supabase client. Please check your credentials.');
    }
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              background: isConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(79, 70, 229, 0.2)',
              border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(79, 70, 229, 0.4)'}`,
              padding: '0.45rem',
              borderRadius: '8px'
            }}>
              <Database size={18} color={isConnected ? '#10b981' : '#818cf8'} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>Supabase Backend Integration</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Connect your PostgreSQL database for persistent ratings and movie storage
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Connection Status Alert */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-card)',
            border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
            marginBottom: '1.25rem'
          }}>
            {isConnected ? (
              <>
                <CheckCircle2 size={16} color="#10b981" />
                <span style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 500 }}>
                  Active Supabase Connection Configured
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={16} color="#9ca3af" />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Currently running in Local Simulation Mode. Connect your Supabase project below to sync to cloud PostgreSQL.
                </span>
              </>
            )}
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Supabase Project URL
              </label>
              <input
                type="text"
                className="search-input"
                style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', width: '100%' }}
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Supabase Anon / Public API Key
              </label>
              <input
                type="password"
                className="search-input"
                style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', width: '100%' }}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
              />
            </div>

            {statusMsg && (
              <div style={{ fontSize: '0.82rem', color: statusMsg.includes('success') || isConnected ? '#34d399' : '#fbbf24' }}>
                {statusMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setUrl('');
                  setAnonKey('');
                  setSupabaseConfig('', '');
                  setStatusMsg('Reset to local simulation mode.');
                  if (onConfigSaved) onConfigSaved();
                }}
              >
                Clear / Use Mock Mode
              </button>
              <button type="submit" className="btn btn-primary">
                Save & Connect
              </button>
            </div>
          </form>

          {/* Database Schema Guide */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <button
                type="button"
                className="btn btn-subtle"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.82rem' }}
                onClick={() => setShowSchema(!showSchema)}
              >
                <Code size={14} />
                <span>{showSchema ? 'Hide SQL Schema' : 'View Supabase SQL Table Schema'}</span>
              </button>

              {showSchema && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                  onClick={handleCopySchema}
                >
                  {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy SQL'}</span>
                </button>
              )}
            </div>

            {showSchema && (
              <pre style={{
                background: '#090d14',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.78rem',
                color: '#cbd5e1',
                overflowX: 'auto',
                lineHeight: 1.45,
                maxHeight: '220px'
              }}>
                {SUPABASE_SQL_SCHEMA}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
