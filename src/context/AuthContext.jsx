import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabase } from '../services/supabaseClient';

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
    const saved = localStorage.getItem('cinematch_auth_role');
    return saved || null;
  });
  const [registeredUsers, setRegisteredUsers] = useState(() => {
    const saved = localStorage.getItem('cinematch_custom_users');
    return saved ? JSON.parse(saved) : {};
  });

  const supabase = getSupabase();

  useEffect(() => {
    if (!supabase) return;

    // Supabase session listener (for Google OAuth or direct Supabase logins)
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

  // Handle local credentials login or Supabase login
  const loginWithCredentials = async (username, password) => {
    const uname = username.trim().toLowerCase();
    
    // Check built-in preset accounts first
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
        localStorage.setItem('cinematch_auth_user', JSON.stringify(userData));
        localStorage.setItem('cinematch_auth_role', userRole);
        return { success: true };
      } else {
        return { success: false, error: 'Incorrect password for ' + uname };
      }
    }

    // Check newly registered custom users
    if (registeredUsers[uname]) {
      if (registeredUsers[uname].password === password) {
        const userData = {
          id: `user_${uname}`,
          username: uname,
          email: `${uname}@cinematch.ai`,
          name: registeredUsers[uname].name || uname
        };
        const userRole = registeredUsers[uname].role || 'user';
        setUser(userData);
        setRole(userRole);
        localStorage.setItem('cinematch_auth_user', JSON.stringify(userData));
        localStorage.setItem('cinematch_auth_role', userRole);
        return { success: true };
      } else {
        return { success: false, error: 'Incorrect password' };
      }
    }

    // Optional Supabase attempt
    if (supabase) {
      try {
        const email = uname.includes('@') ? uname : `${uname}@cinematch.ai`;
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error && data?.user) {
          const u = data.user;
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

  // Handle Signup
  const signupWithCredentials = async (username, password) => {
    const uname = username.trim().toLowerCase();
    if (DEFAULT_ACCOUNTS[uname] || registeredUsers[uname]) {
      return { success: false, error: 'Username already exists' };
    }

    const newUser = {
      username: uname,
      password: password,
      role: uname.startsWith('admin') ? 'admin' : 'user',
      createdAt: new Date().toISOString()
    };

    const updated = { ...registeredUsers, [uname]: newUser };
    setRegisteredUsers(updated);
    localStorage.setItem('cinematch_custom_users', JSON.stringify(updated));

    // Automatically log in
    const userData = {
      id: `user_${uname}`,
      username: uname,
      email: `${uname}@cinematch.ai`,
      name: uname
    };
    setUser(userData);
    setRole(newUser.role);
    localStorage.setItem('cinematch_auth_user', JSON.stringify(userData));
    localStorage.setItem('cinematch_auth_role', newUser.role);
    // Clear genre prefs so genre-selection modal shows for this new user
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
        // Fallback mock google user for local demo if OAuth keys aren't set in Supabase dashboard
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
      // Mock Google sign in
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
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {}
    }
    setUser(null);
    setRole(null);
    localStorage.removeItem('cinematch_auth_user');
    localStorage.removeItem('cinematch_auth_role');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
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
