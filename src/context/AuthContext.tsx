
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

type OrganizationProfile = {
  id: string;
  email: string;
  role: string;
  organization_name: string | null;
  logo_url: string | null;
  about: string | null;
};

type AuthContextType = {
  user: User | null;
  profile: OrganizationProfile | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  signup: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<OrganizationProfile>) => Promise<void>;
  uploadLogo: (file: File) => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // First set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      
      if (currentUser) {
        // Use setTimeout to avoid potential deadlocks with Supabase auth
        setTimeout(() => {
          fetchProfile(currentUser.id);
        }, 0);
      } else {
        setProfile(null);
      }
      
      if (event === 'SIGNED_OUT') {
        navigate('/login');
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        const currentPath = window.location.pathname;
        if (currentPath === '/login') {
          navigate('/dashboard');
        }
      }
    });

    // Then check for existing session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    try {
      // Use a raw SQL query through Supabase to bypass RLS completely
      const { data, error } = await supabase.rpc('get_user_profile', { 
        user_id: userId 
      });
        
      if (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error fetching profile",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      
      if (data) {
        setProfile(data as OrganizationProfile);
      } else {
        console.log('No profile found for user, it may be created by the database trigger');
      }
    } catch (error: any) {
      console.error('Error in fetchProfile:', error);
      toast({
        title: "Profile fetch error",
        description: "Unable to load your profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await supabase.auth.signInWithPassword({ email, password });
      if (response.error) {
        toast({
          title: "Login failed",
          description: response.error.message,
          variant: "destructive",
        });
      }
      return response;
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Login error",
        description: error?.message || "An unexpected error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      const response = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { email }
        }
      });
      
      if (response.error) {
        toast({
          title: "Signup failed",
          description: response.error.message,
          variant: "destructive",
        });
      }
      return response;
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Signup error",
        description: error?.message || "An unexpected error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (error: any) {
      console.error('Logout error:', error);
      toast({
        title: "Logout error",
        description: error?.message || "An unexpected error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateProfile = async (data: Partial<OrganizationProfile>) => {
    if (!user?.id || !profile) {
      toast({
        title: "Update failed",
        description: "You must be logged in to update your profile",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Use RPC function to bypass RLS issues
      const { error } = await supabase.rpc('update_user_profile', {
        p_user_id: user.id,
        p_organization_name: data.organization_name !== undefined ? data.organization_name : profile.organization_name,
        p_about: data.about !== undefined ? data.about : profile.about,
        p_logo_url: data.logo_url !== undefined ? data.logo_url : profile.logo_url
      });
        
      if (error) {
        console.error('Profile update error:', error);
        toast({
          title: "Update failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
      
      // Update local profile state
      setProfile(prev => prev ? { ...prev, ...data } : null);
      
      toast({
        title: "Profile updated",
        description: "Your organization profile has been updated successfully",
      });
      
      // Re-fetch the profile to ensure it's up to date
      await fetchProfile(user.id);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: error?.message || "An unexpected error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    if (!user?.id) {
      toast({
        title: "Upload failed",
        description: "You must be logged in to upload a logo",
        variant: "destructive",
      });
      return null;
    }
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('brand_images')
        .upload(filePath, file);
        
      if (uploadError) {
        console.error('Logo upload error:', uploadError);
        toast({
          title: "Upload failed",
          description: uploadError.message,
          variant: "destructive",
        });
        throw uploadError;
      }
      
      const { data } = supabase.storage
        .from('brand_images')
        .getPublicUrl(filePath);
        
      return data.publicUrl;
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Upload failed",
        description: error?.message || "An unexpected error occurred",
        variant: "destructive",
      });
      return null;
    }
  };

  const isAdmin = profile?.role === 'admin';

  const value = {
    user,
    profile,
    isAdmin,
    loading,
    login,
    signup,
    logout,
    updateProfile,
    uploadLogo
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
