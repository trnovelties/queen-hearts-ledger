
import { ReactNode, useEffect, useState } from "react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { ArrowLeft, BarChart2, LogOut, PieChart, Settings, User, Menu, X, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "./ui/card";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { AdminViewIcon } from "./icons/AdminViewIcon";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({
  children
}: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const {
    toast
  } = useToast();
  const {
    profile
  } = useAuth();
  useEffect(() => {
    async function checkSession() {
      try {
        const {
          data: {
            session
          }
        } = await supabase.auth.getSession();
        setIsLoggedIn(!!session);
        if (!session && location.pathname !== "/login") {
          navigate("/login");
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        setIsLoading(false);
      }
    }
    checkSession();
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
      if (event === "SIGNED_OUT") {
        navigate("/login");
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out."
      });
      navigate("/login");
    } catch (error: any) {
      console.error("Logout error:", error);
      toast({
        title: "Logout error",
        description: error?.message || "An error occurred while logging out.",
        variant: "destructive"
      });
    }
  };
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>;
  }

  // Don't render layout for non-authenticated routes
  if (!isLoggedIn && location.pathname === "/login") {
    return <>{children}</>;
  }
  return <SidebarProvider>
      <AppContent profile={profile} handleLogout={handleLogout} location={location} navigate={navigate}>
        {children}
      </AppContent>
    </SidebarProvider>;
}
interface AppContentProps {
  children: ReactNode;
  profile: any;
  handleLogout: () => void;
  location: any;
  navigate: (path: string) => void;
}
function AppContent({
  children,
  profile,
  handleLogout,
  location,
  navigate
}: AppContentProps) {
  const {
    state,
    toggleSidebar
  } = useSidebar();
  const isCollapsed = state === "collapsed";
  
  return <div className="min-h-screen flex w-full relative bg-background">
      <Sidebar className="border-r border-primary/20 bg-sidebar shadow-lg">
        <SidebarHeader className="py-8 px-6 border-b border-primary/20">
          <div className="flex items-center gap-3">
            {profile?.logo_url ? (
              <Avatar className="h-10 w-10 border-2 border-primary">
                <AvatarImage src={profile.logo_url} alt={profile?.organization_name || "Organization logo"} className="object-cover" />
                <AvatarFallback className="bg-primary text-white font-bold">
                  {profile?.organization_name?.charAt(0) || "♥"}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-lg">♥</span>
              </div>
            )}
            <div className="flex flex-col">
              <h2 className="text-lg font-bold text-white leading-tight">
                {profile?.organization_name || "Queen of Hearts"}
              </h2>
              <span className="text-xs text-white/70">Manager</span>
            </div>
          </div>
        </SidebarHeader>
        
        <SidebarContent className="py-4">
          <SidebarGroup>
            <SidebarGroupLabel className="text-sm font-semibold text-white/60 uppercase tracking-wider px-6 py-4">
              Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-3">
              <SidebarMenu className="space-y-1">
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => navigate("/dashboard")} 
                    className={`h-12 rounded-lg transition-all duration-200 ${
                      location.pathname === "/dashboard" 
                        ? "bg-primary text-white shadow-md" 
                        : "text-white/80 hover:bg-primary/20 hover:text-white"
                    }`}
                  >
                    <BarChart2 className="h-5 w-5" />
                    <span className="font-medium">Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => navigate("/income-expense")} 
                    className={`h-12 rounded-lg transition-all duration-200 ${
                      location.pathname === "/income-expense" 
                        ? "bg-primary text-white shadow-md" 
                        : "text-white/80 hover:bg-primary/20 hover:text-white"
                    }`}
                  >
                    <PieChart className="h-5 w-5" />
                    <span className="font-medium">Income vs Expense</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => navigate("/admin")} 
                    className={`h-12 rounded-lg transition-all duration-200 ${
                      location.pathname === "/admin" 
                        ? "bg-primary text-white shadow-md" 
                        : "text-white/80 hover:bg-primary/20 hover:text-white"
                    }`}
                  >
                    <Settings className="h-5 w-5" />
                    <span className="font-medium">Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => navigate("/compliance")} 
                    className={`h-12 rounded-lg transition-all duration-200 ${
                      location.pathname === "/compliance" 
                        ? "bg-primary text-white shadow-md" 
                        : "text-white/80 hover:bg-primary/20 hover:text-white"
                    }`}
                  >
                    <Shield className="h-5 w-5" />
                    <span className="font-medium">Compliance</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                {profile?.role === 'admin' && (
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => navigate("/admin-view")} 
                      className={`h-12 rounded-lg transition-all duration-200 ${
                        location.pathname === "/admin-view" 
                          ? "bg-primary text-white shadow-md" 
                          : "text-white/80 hover:bg-primary/20 hover:text-white"
                      }`}
                    >
                      <AdminViewIcon className="h-5 w-5" />
                      <span className="font-medium">Admin View</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => navigate("/account")} 
                    className={`h-12 rounded-lg transition-all duration-200 ${
                      location.pathname === "/account" 
                        ? "bg-primary text-white shadow-md" 
                        : "text-white/80 hover:bg-primary/20 hover:text-white"
                    }`}
                  >
                    <User className="h-5 w-5" />
                    <span className="font-medium">Account</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        
        <SidebarFooter className="p-3">
          <Button 
            onClick={handleLogout} 
            variant="ghost" 
            className="w-full h-12 justify-start text-white/80 hover:text-white hover:bg-primary/20 rounded-lg transition-all duration-200"
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span className="font-medium">Logout</span>
          </Button>
        </SidebarFooter>
      </Sidebar>

      {/* Modern toggle button */}
      <div 
        className="fixed top-6 z-50 transition-all duration-300 ease-out" 
        style={{
          left: isCollapsed ? '20px' : '276px'
        }}
      >
        <button 
          onClick={toggleSidebar} 
          className="w-10 h-10 bg-white border-2 border-primary/20 hover:border-primary rounded-lg flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 group" 
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
          )}
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        <header className="h-20 border-b border-border/20 flex items-center px-8 justify-between bg-white shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-1 h-8 bg-primary rounded-full"></div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {location.pathname === "/dashboard" && "Dashboard"}
              {location.pathname === "/income-expense" && "Income vs Expense"}
              {location.pathname === "/admin" && "Settings"}
              {location.pathname === "/compliance" && "Compliance"}
              {location.pathname === "/admin-view" && "Admin View"}
              {location.pathname === "/account" && "Account"}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">
                {profile?.organization_name || "Queen of Hearts"}
              </p>
              <p className="text-xs text-muted-foreground">Manager</p>
            </div>
            {profile?.logo_url ? (
              <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-md">
                <AvatarImage src={profile.logo_url} alt={profile?.organization_name || "Organization logo"} className="object-cover" />
                <AvatarFallback className="bg-primary text-white font-bold text-lg">
                  {profile?.organization_name?.charAt(0) || "♥"}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-md">
                <AvatarFallback className="bg-primary text-white font-bold text-lg">
                  {profile?.organization_name?.charAt(0) || "♥"}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 bg-accent/30">
          <Card className="overflow-hidden border-border/20 shadow-sm bg-white">
            <CardContent className="p-8">
              {children}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>;
}
