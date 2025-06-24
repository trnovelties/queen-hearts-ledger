
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

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAdmin } = useAuth();
  const [viewingOrganization, setViewingOrganization] = useState<ViewingOrganization | null>(null);

  const switchToOrganization = (org: ViewingOrganization) => {
    if (!isAdmin) {
      console.error('Only admins can switch to other organizations');
      return;
    }
    console.log('AdminContext: Admin switching to organization:', org);
    setViewingOrganization(org);
  };

  const returnToAdminView = () => {
    console.log('AdminContext: Returning to admin view');
    setViewingOrganization(null);
  };

  const getCurrentUserId = () => {
    console.log('AdminContext: getCurrentUserId called');
    console.log('AdminContext: isAdmin:', isAdmin);
    console.log('AdminContext: viewingOrganization:', viewingOrganization);
    console.log('AdminContext: user?.id:', user?.id);
    
    // If admin is viewing another organization, return that organization's ID
    if (isAdmin && viewingOrganization) {
      console.log('AdminContext: Admin viewing organization, returning org ID:', viewingOrganization.id);
      return viewingOrganization.id;
    }
    
    // Otherwise return the current user's ID
    console.log('AdminContext: Returning current user ID:', user?.id || null);
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

  console.log('AdminContext: Provider value:', value);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
