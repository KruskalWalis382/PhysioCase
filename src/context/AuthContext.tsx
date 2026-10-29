import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (updatedData: Partial<User>) => void;
}

const STORAGE_KEY = 'physiocase_session_user';
const REMEMBER_KEY = 'physiocase_remember_me';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check local storage on mount for remembered session
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY);
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error('Failed to load session:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string, remember: boolean): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    // Simulate realistic clinical authentication handshake
    await new Promise((resolve) => setTimeout(resolve, 650));

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setIsLoading(false);
      return { success: false, error: 'Please enter your professional email address.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setIsLoading(false);
      return { success: false, error: 'Please enter a valid clinical email address.' };
    }

    if (!password || password.length < 6) {
      setIsLoading(false);
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    // Derive display name from email address if signing in fresh
    const namePart = cleanEmail.split('@')[0];
    const formattedName = namePart
      .split(/[._-]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ') || 'Clinician';

    const initials = formattedName
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'PT';

    const authenticatedUser: User = {
      id: 'usr_' + Date.now().toString(36),
      name: formattedName.startsWith('Dr') ? formattedName : `Dr. ${formattedName}`,
      email: cleanEmail,
      title: 'Physiotherapist, MPT',
      clinicName: 'Active Journey Physical Therapy',
      registrationNumber: 'PT-782914',
      initials: initials.length > 0 ? initials : 'PT',
    };

    setUser(authenticatedUser);

    if (remember) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(authenticatedUser));
        localStorage.setItem(REMEMBER_KEY, 'true');
      } catch (e) {
        console.error('Storage error:', e);
      }
    } else {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(authenticatedUser));
      } catch (e) {
        console.error('Session storage error:', e);
      }
    }

    setIsLoading(false);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(REMEMBER_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Error clearing session:', e);
    }
  };

  const updateUser = (updatedData: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updatedData };
    setUser(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to update user in storage:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
