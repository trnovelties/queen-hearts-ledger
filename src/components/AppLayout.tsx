
import { ReactNode, useEffect, useState } from "react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { ArrowLeft, BarChart2, LogOut, PieChart, Settings, User, Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
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
      <Sidebar className="border-r border-border/40">
        <SidebarHeader className="pt-6 pb-4 px-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white pl-2">
              {profile?.organization_name || "Queen of Hearts"}
            </h2>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-base mx-0 px-0 py-[21px]">Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => navigate("/dashboard")} className={location.pathname === "/dashboard" ? "bg-sidebar-primary" : ""}>
                    <BarChart2 className="mr-2 h-6 w-6" />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => navigate("/income-expense")} className={location.pathname === "/income-expense" ? "bg-sidebar-primary" : ""}>
                    <PieChart className="mr-2 h-6 w-6" />
                    <span>Income vs Expense</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => navigate("/admin")} className={location.pathname === "/admin" ? "bg-sidebar-primary" : ""}>
                    <Settings className="mr-2 h-6 w-6" />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {profile?.role === 'admin' && <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate("/admin-view")} className={location.pathname === "/admin-view" ? "bg-sidebar-primary" : ""}>
                      <AdminViewIcon className="mr-2 h-6 w-6" />
                      <span>Admin View</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>}
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => navigate("/account")} className={location.pathname === "/account" ? "bg-sidebar-primary" : ""}>
                    <User className="mr-2 h-6 w-6" />
                    <span>Account</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-sidebar-foreground hover:text-white hover:bg-sidebar-primary">
            <LogOut className="mr-2 h-6 w-6" />
            Logout
          </Button>
        </SidebarFooter>
      </Sidebar>

      {/* Floating expand/collapse button */}
      <div className="fixed top-1/2 left-0 z-50 transform -translate-y-1/2 transition-all duration-300" style={{
      left: isCollapsed ? '0px' : '256px'
    }}>
        <button onClick={toggleSidebar} className="w-12 h-12 bg-[#A1E96C] hover:bg-[#8fd956] rounded-full flex items-center justify-center shadow-lg transition-all duration-300 border-2 border-white" aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {isCollapsed ? <ChevronRight className="w-6 h-6 text-[#132E2C]" /> : <ChevronLeft className="w-6 h-6 text-[#132E2C]" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border/40 flex items-center px-6 justify-between bg-white">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-primary">
              {location.pathname === "/dashboard" && "Dashboard"}
              {location.pathname === "/income-expense" && "Income vs Expense"}
              {location.pathname === "/admin" && "Settings"}
              {location.pathname === "/admin-view" && "Admin View"}
              {location.pathname === "/account" && "Account"}
            </h1>
          </div>
          
          <div className="flex items-center">
            {profile?.logo_url ? <Avatar className="h-10 w-10 border-2 border-primary">
                <AvatarImage src={profile.logo_url} alt={profile?.organization_name || "Organization logo"} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {profile?.organization_name?.charAt(0) || "♥"}
                </AvatarFallback>
              </Avatar> : <Avatar className="h-10 w-10 border-2 border-primary">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {profile?.organization_name?.charAt(0) || "♥"}
                </AvatarFallback>
              </Avatar>}
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
