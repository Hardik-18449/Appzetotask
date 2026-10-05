import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { initSocketClient, disconnectSocket, joinOrgRoom } from '../services/socket';
import { IUser, IOrganization, OrgRole } from '../types';

interface AuthContextType {
  user: IUser | null;
  organizations: IOrganization[];
  activeOrg: IOrganization | null;
  activeRole: OrgRole | null;
  isLoading: boolean;
  login: (user: IUser) => Promise<void>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => void;
  refreshOrganizations: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [organizations, setOrganizations] = useState<IOrganization[]>([]);
  const [activeOrg, setActiveOrg] = useState<IOrganization | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchOrganizations = async (): Promise<IOrganization[]> => {
    try {
      const res = await api.get('/organizations');
      const orgs: IOrganization[] = res.data.data;
      setOrganizations(orgs);

      // Restore active organization from persistent UI state
      const savedOrgId = localStorage.getItem('nexus_active_org_id');
      const matched = orgs.find((o) => o._id === savedOrgId) || orgs[0] || null;

      if (matched) {
        setActiveOrg(matched);
        localStorage.setItem('nexus_active_org_id', matched._id);
        joinOrgRoom(matched._id);
      } else {
        setActiveOrg(null);
        localStorage.removeItem('nexus_active_org_id');
      }

      return orgs;
    } catch (err) {
      console.error('Failed to load organizations:', err);
      return [];
    }
  };

  const checkAuth = async () => {
    try {
      // Browser automatically transmits HTTP-only session cookie
      const res = await api.get('/auth/me');
      setUser(res.data.data);
      initSocketClient();
      await fetchOrganizations();
    } catch (err) {
      setUser(null);
      setOrganizations([]);
      setActiveOrg(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setOrganizations([]);
      setActiveOrg(null);
      disconnectSocket();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (newUser: IUser) => {
    setUser(newUser);
    initSocketClient();
    await fetchOrganizations();
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('nexus_active_org_id');
      setUser(null);
      setOrganizations([]);
      setActiveOrg(null);
      disconnectSocket();
    }
  };

  const switchOrganization = (orgId: string) => {
    const org = organizations.find((o) => o._id === orgId);
    if (org) {
      setActiveOrg(org);
      localStorage.setItem('nexus_active_org_id', org._id);
      joinOrgRoom(org._id);
    }
  };

  const refreshOrganizations = async () => {
    await fetchOrganizations();
  };

  const activeRole: OrgRole | null = activeOrg ? activeOrg.role : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        activeOrg,
        activeRole,
        isLoading,
        login,
        logout,
        switchOrganization,
        refreshOrganizations,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
