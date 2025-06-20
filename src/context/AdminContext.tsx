
import { createContext, useContext, useState, ReactNode } from 'react';
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

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAdmin } = useAuth();
  const [viewingOrganization, setViewingOrganization] = useState<ViewingOrganization | null>(null);

  const switchToOrganization = (org: ViewingOrganization) => {
    if (!isAdmin) return;
    setViewingOrganization(org);
  };

  const returnToAdminView = () => {
    setViewingOrganization(null);
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
