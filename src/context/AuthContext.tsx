import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Role, Settings } from '@shared/types';
import { apiRequest } from '../utils/api';
import { playPosSound } from '../utils/formatters';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOwnerAtCounter: boolean;
  settings: Settings | null;
  login: (userId: string, pin: string) => Promise<void>;
  logout: () => void;
  lockSession: () => void;
  toggleOwnerPresence: (enabled: boolean, adminPin?: string) => Promise<void>;
  updateProfileName: (newName: string) => Promise<void>;
  requestAdminApproval: (actionDescription: string) => Promise<string | null>;
  refreshSettings: () => Promise<void>;
  adminApprovalModal: {
    isOpen: boolean;
    actionDescription: string;
    resolve: ((approverId: string | null) => void) | null;
  };
  closeAdminApprovalModal: (approvedUserId: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('mangalore_pos_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('mangalore_pos_token'));
  const [isOwnerAtCounter, setIsOwnerAtCounter] = useState<boolean>(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [adminApprovalModal, setAdminApprovalModal] = useState<{
    isOpen: boolean;
    actionDescription: string;
    resolve: ((approverId: string | null) => void) | null;
  }>({
    isOpen: false,
    actionDescription: '',
    resolve: null,
  });

  const refreshSettings = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ settings: Settings }>('/settings');
      setSettings(data.settings);
    } catch {
      // Offline fallback
    }
  }, [token]);

  const checkOwnerPresence = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ isOwnerAtCounter: boolean }>('/auth/owner-presence');
      setIsOwnerAtCounter(data.isOwnerAtCounter);
    } catch {
      // Ignore
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      refreshSettings();
      checkOwnerPresence();
      const interval = setInterval(checkOwnerPresence, 30000);
      return () => clearInterval(interval);
    }
  }, [token, refreshSettings, checkOwnerPresence]);

  const login = async (userId: string, pin: string) => {
    try {
      const data = await apiRequest<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ userId, pin }),
      });

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('mangalore_pos_user', JSON.stringify(data.user));
      localStorage.setItem('mangalore_pos_token', data.token);

      playPosSound('success');
    } catch (err: any) {
      playPosSound('error');
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsOwnerAtCounter(false);
    localStorage.removeItem('mangalore_pos_user');
    localStorage.removeItem('mangalore_pos_token');
  };

  const lockSession = () => {
    if (user) {
      // Keep user pre-selected on PIN unlock screen
      setToken(null);
      localStorage.removeItem('mangalore_pos_token');
    }
  };

  const toggleOwnerPresence = async (enabled: boolean, adminPin?: string) => {
    try {
      const data = await apiRequest<{ isOwnerAtCounter: boolean }>('/auth/owner-presence', {
        method: 'POST',
        body: JSON.stringify({ enabled, adminPin }),
      });
      setIsOwnerAtCounter(data.isOwnerAtCounter);
      playPosSound('click');
    } catch (err: any) {
      playPosSound('error');
      throw err;
    }
  };

  const updateProfileName = async (newName: string) => {
    try {
      const data = await apiRequest<{ user: User }>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: newName }),
      });
      setUser(data.user);
      localStorage.setItem('mangalore_pos_user', JSON.stringify(data.user));
      playPosSound('success');
    } catch (err: any) {
      playPosSound('error');
      throw err;
    }
  };

  // In-line Admin PIN Prompt Promise
  const requestAdminApproval = useCallback(
    (actionDescription: string): Promise<string | null> => {
      if (user?.role === 'admin' || isOwnerAtCounter) {
        return Promise.resolve(user?.id || 'admin');
      }

      return new Promise((resolve) => {
        setAdminApprovalModal({
          isOpen: true,
          actionDescription,
          resolve,
        });
      });
    },
    [user, isOwnerAtCounter]
  );

  const closeAdminApprovalModal = (approvedUserId: string | null) => {
    if (adminApprovalModal.resolve) {
      adminApprovalModal.resolve(approvedUserId);
    }
    setAdminApprovalModal({
      isOpen: false,
      actionDescription: '',
      resolve: null,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === 'admin',
        isOwnerAtCounter,
        settings,
        login,
        logout,
        lockSession,
        toggleOwnerPresence,
        updateProfileName,
        requestAdminApproval,
        refreshSettings,
        adminApprovalModal,
        closeAdminApprovalModal,
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
