
import { ReactNode, useEffect, useState } from "react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, BarChart2, LogOut, PieChart, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "./ui/card";
import { useLocation, useNavigate } from "react-router-dom";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);

    // If not logged in and not on login page, redirect to login
    if (!token && location.pathname !== "/login") {
      navigate("/login");
    }
  }, [navigate, location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    navigate("/login");
  };

  // Don't render layout for non-authenticated routes
  if (!isLoggedIn && location.pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-r border-border/40">
          <SidebarHeader className="flex items-center justify-center pt-6 pb-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <span className="mr-2 text-secondary">♥</span>
              Queen of Hearts
            </h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => navigate("/dashboard")}
                      className={location.pathname === "/dashboard" ? "bg-sidebar-primary" : ""}
                    >
                      <BarChart2 className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => navigate("/income-expense")}
                      className={location.pathname === "/income-expense" ? "bg-sidebar-primary" : ""}
                    >
                      <PieChart className="mr-2 h-4 w-4" />
                      <span>Income vs Expense</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => navigate("/admin")}
                      className={location.pathname === "/admin" ? "bg-sidebar-primary" : ""}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Admin Panel</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => navigate("/users")}
                      className={location.pathname === "/users" ? "bg-sidebar-primary" : ""}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      <span>Users</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <Button 
              onClick={handleLogout} 
              variant="ghost" 
              className="w-full justify-start text-sidebar-foreground hover:text-white hover:bg-sidebar-primary"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border/40 flex items-center px-6 justify-between bg-white">
            <div className="flex items-center">
              <SidebarTrigger>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </SidebarTrigger>
              <h1 className="ml-4 text-xl font-semibold text-primary">
                {location.pathname === "/dashboard" && "Dashboard"}
                {location.pathname === "/income-expense" && "Income vs Expense"}
                {location.pathname === "/admin" && "Admin Panel"}
                {location.pathname === "/users" && "User Management"}
              </h1>
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
      </div>
    </SidebarProvider>
  );
}
