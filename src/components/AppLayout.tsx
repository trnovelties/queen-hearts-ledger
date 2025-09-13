import { ReactNode, useEffect, useState } from "react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { ArrowLeft, BarChart2, LogOut, PieChart, Settings, User, Menu, X, ChevronLeft, ChevronRight, Shield, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "./ui/card";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { PageLoading } from "@/components/ui/loading";
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
    return <PageLoading message="Initializing application..." />;
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
        <SidebarHeader className="h-16 pl-2 pr-4 border-b border-sidebar-border flex items-center justify-center">
          <div className="flex items-center gap-2 min-w-0 flex-1 pl-1">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={profile?.logo_url} alt="Organization Logo" />
              <AvatarFallback className="bg-red-500 text-white font-semibold">
                {profile?.organization_name?.charAt(0)?.toUpperCase() || 'O'}
              </AvatarFallback>
            </Avatar>
            <span className="text-base font-medium text-sidebar-foreground truncate">
              {profile?.organization_name || 'Organization'}
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="mt-6">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className={`relative ${location.pathname === "/dashboard" ? "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-red-500" : ""}`}>
                  <SidebarMenuButton onClick={() => navigate("/dashboard")} className={`flex items-center gap-3 px-4 py-6 text-sidebar-foreground hover:bg-gray-100 hover:text-black transition-colors ${location.pathname === "/dashboard" ? "bg-gray-100 text-black font-medium" : ""}`}>
                    <BarChart2 className={`h-5 w-5 ${location.pathname === "/dashboard" ? "text-red-500" : "text-primary"}`} />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem className={`relative ${location.pathname === "/income-expense" ? "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-red-500" : ""}`}>
                  <SidebarMenuButton onClick={() => navigate("/income-expense")} className={`flex items-center gap-3 px-4 py-6 text-sidebar-foreground hover:bg-gray-100 hover:text-black transition-colors ${location.pathname === "/income-expense" ? "bg-gray-100 text-black font-medium" : ""}`}>
                    <PieChart className={`h-5 w-5 ${location.pathname === "/income-expense" ? "text-red-500" : "text-primary"}`} />
                    <span>Income vs Expense</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem className={`relative ${location.pathname === "/admin" ? "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-red-500" : ""}`}>
                  <SidebarMenuButton onClick={() => navigate("/admin")} className={`flex items-center gap-3 px-4 py-6 text-sidebar-foreground hover:bg-gray-100 hover:text-black transition-colors ${location.pathname === "/admin" ? "bg-gray-100 text-black font-medium" : ""}`}>
                    <Settings className={`h-5 w-5 ${location.pathname === "/admin" ? "text-red-500" : "text-primary"}`} />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem className={`relative ${location.pathname === "/compliance" ? "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-red-500" : ""}`}>
                  <SidebarMenuButton onClick={() => navigate("/compliance")} className={`flex items-center gap-3 px-4 py-6 text-sidebar-foreground hover:bg-gray-100 hover:text-black transition-colors ${location.pathname === "/compliance" ? "bg-gray-100 text-black font-medium" : ""}`}>
                    <BookOpen className={`h-5 w-5 ${location.pathname === "/compliance" ? "text-red-500" : "text-primary"}`} />
                    <span>Resources</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {profile?.role === 'admin' && <SidebarMenuItem className={`relative ${location.pathname === "/admin-view" ? "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-red-500" : ""}`}>
                    <SidebarMenuButton onClick={() => navigate("/admin-view")} className={`flex items-center gap-3 px-4 py-6 text-sidebar-foreground hover:bg-gray-100 hover:text-black transition-colors ${location.pathname === "/admin-view" ? "bg-gray-100 text-black font-medium" : ""}`}>
                      <AdminViewIcon className={`h-5 w-5 ${location.pathname === "/admin-view" ? "text-red-500" : "text-primary"}`} />
                      <span>Admin View</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>}
                <SidebarMenuItem className={`relative ${location.pathname === "/account" ? "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-red-500" : ""}`}>
                  <SidebarMenuButton onClick={() => navigate("/account")} className={`flex items-center gap-3 px-4 py-6 text-sidebar-foreground hover:bg-gray-100 hover:text-black transition-colors ${location.pathname === "/account" ? "bg-gray-100 text-black font-medium" : ""}`}>
                    <User className={`h-5 w-5 ${location.pathname === "/account" ? "text-red-500" : "text-primary"}`} />
                    <span>Account</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-sidebar-border">
          <SidebarMenuButton onClick={handleLogout} className="flex items-center gap-3 px-4 py-6 text-sidebar-foreground hover:bg-gray-100 hover:text-black transition-colors w-full justify-start">
            <LogOut className="h-5 w-5 text-primary" />
            <span>Logout</span>
          </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>

      {/* Floating expand/collapse button */}
      <div className="fixed top-1/2 left-0 z-50 transform -translate-y-1/2 transition-all duration-300" style={{
      left: isCollapsed ? '13px' : '223px'
    }}>
        <button onClick={toggleSidebar} className="w-8 h-8 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center shadow-sm transition-all duration-300 border-2 border-red-500 hover:border-red-600" aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {isCollapsed ? <ChevronRight className="w-4 h-4 text-red-600" /> : <ChevronLeft className="w-4 h-4 text-red-600" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border flex items-center px-12 justify-between bg-white">
          <div className="flex items-center">
            <h1 className="text-2xl text-black font-semibold">
              {location.pathname === "/dashboard" && "Dashboard"}
              {location.pathname === "/income-expense" && "Income vs Expense"}
              {location.pathname === "/admin" && "Settings"}
              {location.pathname === "/compliance" && "Resources"}
              {location.pathname === "/admin-view" && "Admin View"}
              {location.pathname === "/account" && "Account"}
            </h1>
          </div>
          
          <div className="flex items-center p-4">
            <img src="https://isjbdwxngfrgftfannzi.supabase.co/storage/v1/object/public/app_assets/Queen%20of%20Heartts%20Frame%2018.png" alt="Queen of Hearts App Logo" className="h-10 w-10 object-contain rounded-full border-2 border-red-300" />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 bg-accent">
          <Card className="overflow-hidden border-none">
            <CardContent className="p-6">
              {children}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>;
}