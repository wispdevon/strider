'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string | null;
  friendCode: string;
  avatar: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  checkSession: () => Promise<void>;
  login: (credential: any, challengeId: string) => Promise<boolean>;
  register: (name?: string, email?: string) => Promise<{ userId: string; options: any } | null>;
  verifyRegistration: (userId: string, credential: any) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authenticated: false,
  checkSession: async () => {},
  login: async () => false,
  register: async () => null,
  verifyRegistration: async () => false,
  logout: async () => {},
  refreshAuth: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const checkSession = useCallback(async () => {
    console.log('[AuthContext] checkSession called');
    try {
      const response = await fetch('/api/auth/session');
      console.log('[AuthContext] Session response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[AuthContext] Session data:', { authenticated: data.authenticated, userId: data.user?.id, userName: data.user?.name });
        if (data.authenticated) {
          console.log('[AuthContext] User authenticated, setting user state');
          setUser(data.user);
        } else {
          console.log('[AuthContext] Not authenticated, clearing user state');
          setUser(null);
        }
      } else {
        console.log('[AuthContext] Session response not ok, clearing user state');
        setUser(null);
      }
    } catch (err) {
      console.error('[AuthContext] checkSession error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession, refreshCounter]);

  const register = useCallback(async (name?: string, email?: string) => {
    console.log('[AuthContext] register called:', { name: name || '(auto)', email: email || '(none)' });
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });
    console.log('[AuthContext] register response status:', response.status);

    if (!response.ok) {
      const data = await response.json();
      console.error('[AuthContext] register failed:', data);
      throw new Error(data.error || 'Registration failed');
    }

    const data = await response.json();
    console.log('[AuthContext] register success:', { userId: data.userId, challengeId: data.challengeId });
    return data;
  }, []);

  const verifyRegistration = useCallback(async (userId: string, credential: any) => {
    console.log('[AuthContext] verifyRegistration called:', { userId, credentialId: credential?.id });
    const response = await fetch('/api/auth/register', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, credential }),
    });
    console.log('[AuthContext] verifyRegistration response status:', response.status);

    if (!response.ok) {
      const data = await response.json();
      console.error('[AuthContext] verifyRegistration failed:', data);
      throw new Error(data.error || 'Verification failed');
    }

    console.log('[AuthContext] verifyRegistration success, refreshing session...');
    await checkSession();
    return true;
  }, [checkSession]);

  const login = useCallback(async (credential: any, challengeId: string) => {
    console.log('[AuthContext] login called:', { challengeId, credentialId: credential?.id });
    const response = await fetch('/api/auth/login', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, challengeId }),
    });
    console.log('[AuthContext] login response status:', response.status);

    if (!response.ok) {
      const data = await response.json();
      console.error('[AuthContext] login failed:', data);
      throw new Error(data.error || 'Login failed');
    }

    const data = await response.json();
    console.log('[AuthContext] login success:', { verified: data.verified, userId: data.user?.id });
    console.log('[AuthContext] login: refreshing session...');
    await checkSession();
    return true;
  }, [checkSession]);

  const logout = useCallback(async () => {
    console.log('[AuthContext] logout called');
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    console.log('[AuthContext] logout response status:', response.status);
    setUser(null);
    console.log('[AuthContext] logout: user state cleared');
  }, []);

  const refreshAuth = useCallback(async () => {
    console.log('[AuthContext] refreshAuth called, incrementing refresh counter');
    setRefreshCounter(c => c + 1);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      authenticated: !!user,
      checkSession,
      login,
      register,
      verifyRegistration,
      logout,
      refreshAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}