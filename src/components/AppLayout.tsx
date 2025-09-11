
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
  return <div className="min-h-screen flex w-full relative">
      <Sidebar className="border-r border-sidebar-border bg-sidebar-background">
        <SidebarHeader className="pt-4 pb-2 px-4">
          <div className="flex items-center gap-3">
            {profile?.logo_url ? (
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile.logo_url} alt={profile?.organization_name || "Organization logo"} className="object-cover" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {profile?.organization_name?.charAt(0) || "Q"}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-medium">
                  {profile?.organization_name?.charAt(0) || "Q"}
                </span>
              </div>
            )}
            <h2 className="text-lg font-semibold text-sidebar-foreground">
              {profile?.organization_name || "Queen of Hearts"}
            </h2>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => navigate("/dashboard")} 
                    className={`flex items-center gap-3 px-4 py-3 text-sidebar-foreground hover:bg-sidebar-accent/10 ${
                      location.pathname === "/dashboard" 
                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
                        : ""
                    }`}
                  >
                    <BarChart2 className="h-5 w-5 text-primary" />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => navigate("/income-expense")} 
                    className={`flex items-center gap-3 px-4 py-3 text-sidebar-foreground hover:bg-sidebar-accent/10 ${
                      location.pathname === "/income-expense" 
                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
                        : ""
                    }`}
                  >
                    <PieChart className="h-5 w-5 text-primary" />
                    <span>Income vs Expense</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => navigate("/admin")} 
                    className={`flex items-center gap-3 px-4 py-3 text-sidebar-foreground hover:bg-sidebar-accent/10 ${
                      location.pathname === "/admin" 
                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
                        : ""
                    }`}
                  >
                    <Settings className="h-5 w-5 text-primary" />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => navigate("/compliance")} 
                    className={`flex items-center gap-3 px-4 py-3 text-sidebar-foreground hover:bg-sidebar-accent/10 ${
                      location.pathname === "/compliance" 
                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
                        : ""
                    }`}
                  >
                    <Shield className="h-5 w-5 text-primary" />
                    <span>Compliance</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {profile?.role === 'admin' && (
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => navigate("/admin-view")} 
                      className={`flex items-center gap-3 px-4 py-3 text-sidebar-foreground hover:bg-sidebar-accent/10 ${
                        location.pathname === "/admin-view" 
                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
                          : ""
                      }`}
                    >
                      <AdminViewIcon className="h-5 w-5 text-primary" />
                      <span>Admin View</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => navigate("/account")} 
                    className={`flex items-center gap-3 px-4 py-3 text-sidebar-foreground hover:bg-sidebar-accent/10 ${
                      location.pathname === "/account" 
                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
                        : ""
                    }`}
                  >
                    <User className="h-5 w-5 text-primary" />
                    <span>Account</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <SidebarMenuButton 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-sidebar-foreground hover:bg-sidebar-accent/10 w-full justify-start"
          >
            <LogOut className="h-5 w-5 text-primary" />
            <span>Logout</span>
          </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>

      {/* Floating expand/collapse button */}
      <div className="fixed top-1/2 left-0 z-50 transform -translate-y-1/2 transition-all duration-300" style={{
      left: isCollapsed ? '0px' : '256px'
    }}>
        <button onClick={toggleSidebar} className="w-8 h-8 bg-sidebar-background hover:bg-sidebar-accent/10 rounded-full flex items-center justify-center shadow-sm transition-all duration-300 border border-sidebar-border" aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {isCollapsed ? <ChevronRight className="w-4 h-4 text-sidebar-foreground" /> : <ChevronLeft className="w-4 h-4 text-sidebar-foreground" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border/40 flex items-center px-6 justify-between bg-white">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-primary">
              {location.pathname === "/dashboard" && "Dashboard"}
              {location.pathname === "/income-expense" && "Income vs Expense"}
              {location.pathname === "/admin" && "Settings"}
              {location.pathname === "/compliance" && "Compliance"}
              {location.pathname === "/admin-view" && "Admin View"}
              {location.pathname === "/account" && "Account"}
            </h1>
          </div>
          
          <div className="flex items-center">
            {profile?.logo_url ? (
              <Avatar className="h-10 w-10 border-2 border-primary">
                <AvatarImage src={profile.logo_url} alt={profile?.organization_name || "Organization logo"} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {profile?.organization_name?.charAt(0) || "♥"}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="h-10 w-10 border-2 border-primary">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {profile?.organization_name?.charAt(0) || "♥"}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 bg-accent">
          <Card className="overflow-hidden border-none shadow-md">
            <CardContent className="p-6">
              {children}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>;
}
