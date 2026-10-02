import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabase } from '../services/supabaseClient';
import { loginApi, registerApi, logoutApi } from '../services/mlApi';

const AuthContext = createContext(null);

const DEFAULT_ACCOUNTS = {
  user1: { password: 'password@123', role: 'user', name: 'User 1' },
  admin: { password: 'admin@123', role: 'admin', name: 'System Administrator' }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('cinematch_auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [role, setRole] = useState(() => {
    return localStorage.getItem('cinematch_auth_role') || null;
  });
  const [authToken, setAuthToken] = useState(() => {
    return localStorage.getItem('cinematch_auth_token') || null;
  });

  const supabase = getSupabase();

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        const userEmail = u.email || '';
        const userRole = userEmail.toLowerCase().includes('admin') ? 'admin' : 'user';
        const userData = {
          id: u.id,
          username: u.user_metadata?.full_name || userEmail.split('@')[0] || 'User',
          email: userEmail,
          avatar_url: u.user_metadata?.avatar_url || ''
        };
        setUser(userData);
        setRole(userRole);
        localStorage.setItem('cinematch_auth_user', JSON.stringify(userData));
        localStorage.setItem('cinematch_auth_role', userRole);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        const userEmail = u.email || '';
        const userRole = userEmail.toLowerCase().includes('admin') ? 'admin' : 'user';
        const userData = {
          id: u.id,
          username: u.user_metadata?.full_name || userEmail.split('@')[0] || 'User',
          email: userEmail,
          avatar_url: u.user_metadata?.avatar_url || ''
        };
        setUser(userData);
        setRole(userRole);
        localStorage.setItem('cinematch_auth_user', JSON.stringify(userData));
        localStorage.setItem('cinematch_auth_role', userRole);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase]);

  const loginWithCredentials = async (username, password) => {
    const uname = username.trim().toLowerCase();

    // Try backend authentication first (backend determines role)
    const { data, error } = await loginApi(uname, password);

    if (data && !error) {
      const userData = {
        id: data.user_id,
        username: data.username,
        email: `${data.username}@cinematch.ai`,
        name: data.name,
      };
      setUser(userData);
      setRole(data.role);
      setAuthToken(data.token);
      localStorage.setItem('cinematch_auth_user', JSON.stringify(userData));
      localStorage.setItem('cinematch_auth_role', data.role);
      localStorage.setItem('cinematch_auth_token', data.token);

      if (data.role === 'admin') {
        window.location.hash = '#admin';
      }

      return { success: true };
    }

    // If backend returned a real auth error (not a connection failure), show it
    if (error && !error.includes('unavailable') && !error.includes('Start it with')) {
      return { success: false, error };
    }

    // Backend unreachable — fall back to client-side preset check (offline demo mode)
    if (DEFAULT_ACCOUNTS[uname]) {
      if (DEFAULT_ACCOUNTS[uname].password === password) {
        const userData = {
          id: `preset_${uname}`,
          username: uname,
          email: `${uname}@cinematch.ai`,
          name: DEFAULT_ACCOUNTS[uname].name
        };
        const userRole = DEFAULT_ACCOUNTS[uname].role;
        setUser(userData);
        setRole(userRole);
        setAuthToken(null);
        localStorage.setItem('cinematch_auth_user', JSON.stringify(userData));
        localStorage.setItem('cinematch_auth_role', userRole);
        localStorage.removeItem('cinematch_auth_token');

        if (userRole === 'admin') {
          window.location.hash = '#admin';
        }

        return { success: true };
      } else {
        return { success: false, error: 'Incorrect password for ' + uname };
      }
    }

    // Optional Supabase attempt
    if (supabase) {
      try {
        const email = uname.includes('@') ? uname : `${uname}@cinematch.ai`;
        const { data: sData, error: sError } = await supabase.auth.signInWithPassword({ email, password });
        if (!sError && sData?.user) {
          const u = sData.user;
          const userRole = (u.email || '').includes('admin') ? 'admin' : 'user';
          const userData = {
            id: u.id,
            username: uname,
            email: u.email
          };
          setUser(userData);
          setRole(userRole);
          localStorage.setItem('cinematch_auth_user', JSON.stringify(userData));
          localStorage.setItem('cinematch_auth_role', userRole);
          return { success: true };
        }
      } catch (err) {
        // Fallback error
      }
    }

    return { success: false, error: 'Invalid username or password. Use user1/password@123 or admin/admin@123' };
  };

  const signupWithCredentials = async (username, password) => {
    const uname = username.trim().toLowerCase();

    // Try backend registration first
    const { data, error } = await registerApi(uname, password);

    if (data && !error) {
      const userData = {
        id: data.user_id,
        username: data.username,
        email: `${data.username}@cinematch.ai`,
        name: data.name,
      };
      setUser(userData);
      setRole(data.role); // Always 'user' from backend
      setAuthToken(data.token);
      localStorage.setItem('cinematch_auth_user', JSON.stringify(userData));
      localStorage.setItem('cinematch_auth_role', data.role);
      localStorage.setItem('cinematch_auth_token', data.token);
      localStorage.removeItem('cinematch_user_genres');
      return { success: true, isNewUser: true };
    }

    // If backend returned a real error (not connection), show it
    if (error && !error.includes('unavailable') && !error.includes('Start it with')) {
      return { success: false, error };
    }

    // Backend unreachable — fall back to client-side registration (offline demo)
    if (DEFAULT_ACCOUNTS[uname]) {
      return { success: false, error: 'Username already exists' };
    }

    const registeredUsers = JSON.parse(localStorage.getItem('cinematch_custom_users') || '{}');
    if (registeredUsers[uname]) {
      return { success: false, error: 'Username already exists' };
    }

    const newUser = {
      username: uname,
      password: password,
      role: 'user', // Always user — only backend admin can change roles
      createdAt: new Date().toISOString()
    };

    const updated = { ...registeredUsers, [uname]: newUser };
    localStorage.setItem('cinematch_custom_users', JSON.stringify(updated));

    const userData = {
      id: `user_${uname}`,
      username: uname,
      email: `${uname}@cinematch.ai`,
      name: uname
    };
    setUser(userData);
    setRole('user');
    setAuthToken(null);
    localStorage.setItem('cinematch_auth_user', JSON.stringify(userData));
    localStorage.setItem('cinematch_auth_role', 'user');
    localStorage.removeItem('cinematch_auth_token');
    localStorage.removeItem('cinematch_user_genres');

    return { success: true, isNewUser: true };
  };

  // Google OAuth
  const loginWithGoogle = async () => {
    if (supabase) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) throw error;
      } catch (err) {
        console.error('Google Sign-In Error:', err);
        const mockGoogleUser = {
          id: 'google_user_demo',
          username: 'Google User',
          email: 'google.user@gmail.com',
          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
        };
        setUser(mockGoogleUser);
        setRole('user');
        localStorage.setItem('cinematch_auth_user', JSON.stringify(mockGoogleUser));
        localStorage.setItem('cinematch_auth_role', 'user');
      }
    } else {
      const mockGoogleUser = {
        id: 'google_user_demo',
        username: 'Google User',
        email: 'google.user@gmail.com',
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
      };
      setUser(mockGoogleUser);
      setRole('user');
      localStorage.setItem('cinematch_auth_user', JSON.stringify(mockGoogleUser));
      localStorage.setItem('cinematch_auth_role', 'user');
    }
  };

  const logout = async () => {
    if (authToken) {
      logoutApi(authToken).catch(() => {});
    }
    if (supabase) {
      try { await supabase.auth.signOut(); } catch (e) {}
    }
    setUser(null);
    setRole(null);
    setAuthToken(null);
    localStorage.removeItem('cinematch_auth_user');
    localStorage.removeItem('cinematch_auth_role');
    localStorage.removeItem('cinematch_auth_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        authToken,
        loginWithCredentials,
        signupWithCredentials,
        loginWithGoogle,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
