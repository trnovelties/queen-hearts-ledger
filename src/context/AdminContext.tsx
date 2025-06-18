
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

type ViewingOrganization = {
  id: string;
  email: string;
  organization_name: string | null;
  logo_url: string | null;
  about: string | null;
  role: string;
};

type AdminContextType = {
  viewingOrganization: ViewingOrganization | null;
  isViewingOtherOrganization: boolean;
  switchToOrganization: (org: ViewingOrganization) => void;
  returnToAdminView: () => void;
  getCurrentUserId: () => string | null;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const VIEWING_ORG_STORAGE_KEY = 'admin_viewing_organization';

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAdmin } = useAuth();
  const [viewingOrganization, setViewingOrganization] = useState<ViewingOrganization | null>(null);

  // Restore viewing organization state on mount
  useEffect(() => {
    if (isAdmin) {
      const storedOrg = localStorage.getItem(VIEWING_ORG_STORAGE_KEY);
      if (storedOrg) {
        try {
          const parsedOrg = JSON.parse(storedOrg);
          setViewingOrganization(parsedOrg);
        } catch (error) {
          console.error('Error parsing stored viewing organization:', error);
          localStorage.removeItem(VIEWING_ORG_STORAGE_KEY);
        }
      }
    }
  }, [isAdmin]);

  // Clear stored state when user logs out or is no longer admin
  useEffect(() => {
    if (!isAdmin) {
      localStorage.removeItem(VIEWING_ORG_STORAGE_KEY);
      setViewingOrganization(null);
    }
  }, [isAdmin]);

  const switchToOrganization = (org: ViewingOrganization) => {
    if (!isAdmin) return;
    
    setViewingOrganization(org);
    localStorage.setItem(VIEWING_ORG_STORAGE_KEY, JSON.stringify(org));
  };

  const returnToAdminView = () => {
    setViewingOrganization(null);
    localStorage.removeItem(VIEWING_ORG_STORAGE_KEY);
  };

  const getCurrentUserId = () => {
    if (viewingOrganization && isAdmin) {
      return viewingOrganization.id;
    }
    return user?.id || null;
  };

  const isViewingOtherOrganization = viewingOrganization !== null && isAdmin;

  const value = {
    viewingOrganization,
    isViewingOtherOrganization,
    switchToOrganization,
    returnToAdminView,
    getCurrentUserId
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
