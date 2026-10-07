import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('hercs_auth_token'));
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load available demo users on mount
  useEffect(() => {
    loadDemoUsers();
    if (token) {
      loadCurrentUser();
    } else {
      // Auto-login default demo user (Dr. Marcus at Mayo Central) for seamless initial view
      autoLoginDefaultDemo();
    }
  }, []);

  const loadDemoUsers = async () => {
    try {
      const data = await api.get('/api/auth/users');
      if (data.success) {
        setAvailableUsers(data.users);
      }
    } catch (e) {
      console.warn('Failed to fetch demo users:', e.message);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const data = await api.get('/api/auth/me');
      if (data.success) {
        setUser(data.user);
      }
    } catch (e) {
      console.warn('Session expired or invalid token:', e.message);
      localStorage.removeItem('hercs_auth_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const autoLoginDefaultDemo = async () => {
    try {
      // Login with default seed user
      const data = await api.post('/api/auth/demo-switch', { userId: 'usr_mayo_coordinator' });
      if (data.success) {
        localStorage.setItem('hercs_auth_token', data.token);
        setToken(data.token);
        setUser(data.user);
      }
    } catch (e) {
      console.warn('Auto-login failed:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const switchUser = async (userId) => {
    try {
      setLoading(true);
      const data = await api.post('/api/auth/demo-switch', { userId });
      if (data.success) {
        localStorage.setItem('hercs_auth_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return data.user;
      }
    } catch (e) {
      console.error('Error switching user:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password });
    if (data.success) {
      localStorage.setItem('hercs_auth_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    }
  };

  const logout = () => {
    localStorage.removeItem('hercs_auth_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        availableUsers,
        switchUser,
        login,
        logout,
        currentHospital: user?.hospital || null
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
