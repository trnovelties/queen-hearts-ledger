
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useAdmin } from "@/context/AdminContext";
import { AdminViewingIndicator } from "@/components/AdminViewingIndicator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Mail, Calendar, Shield, Users, ExternalLink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

type Organization = {
  id: string;
  email: string;
  role: string;
  organization_name: string | null;
  logo_url: string | null;
  about: string | null;
  created_at: string;
};

export default function AdminView() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { switchToOrganization } = useAdmin();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to view this page.",
        variant: "destructive",
      });
      return;
    }
    
    fetchAllOrganizations();
  }, [isAdmin, toast]);

  const fetchAllOrganizations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrganizations(data || []);
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      toast({
        title: "Error",
        description: "Failed to load organizations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Role Updated",
        description: "User role has been updated successfully.",
      });

      fetchAllOrganizations();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive",
      });
    }
  };

  const handleOrganizationClick = (org: Organization) => {
    switchToOrganization({
      id: org.id,
      email: org.email,
      organization_name: org.organization_name,
      logo_url: org.logo_url,
      about: org.about,
      role: org.role
    });
    navigate('/dashboard');
  };

  const filteredOrganizations = organizations.filter((org) => {
    const matchesSearch = 
      org.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || org.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  if (!isAdmin) {
    return (
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminViewingIndicator />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin View</h1>
          <p className="text-muted-foreground">Manage all organizations and users</p>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">{filteredOrganizations.length} Organizations</span>
        </div>
      </div>

      {/* Search and Filter Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by organization name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="organizer">Organizer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Organizations Grid */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrganizations.map((org) => (
            <Card 
              key={org.id} 
              className="hover:shadow-lg transition-all cursor-pointer group hover:border-primary/50"
              onClick={() => handleOrganizationClick(org)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  {org.logo_url ? (
                    <Avatar className="h-12 w-12 border-2 border-primary group-hover:border-primary/80">
                      <AvatarImage 
                        src={org.logo_url} 
                        alt={org.organization_name || "Organization logo"} 
                        className="object-cover" 
                      />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {org.organization_name?.charAt(0) || org.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Avatar className="h-12 w-12 border-2 border-primary group-hover:border-primary/80">
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {org.organization_name?.charAt(0) || org.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                      {org.organization_name || "Unnamed Organization"}
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant={org.role === 'admin' ? 'default' : 'secondary'}>
                        {org.role === 'admin' ? (
                          <>
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </>
                        ) : (
                          'Organizer'
                        )}
                      </Badge>
                      <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{org.email}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {new Date(org.created_at).toLocaleDateString()}</span>
                </div>
                
                {org.about && (
                  <CardDescription className="text-xs line-clamp-2">
                    {org.about}
                  </CardDescription>
                )}
                
                <div className="pt-2">
                  <Select 
                    value={org.role} 
                    onValueChange={(newRole) => {
                      // Prevent event propagation to avoid card click
                      updateUserRole(org.id, newRole);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectTrigger className="h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="organizer">Organizer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredOrganizations.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No organizations found</h3>
            <p className="text-muted-foreground">
              {searchTerm || roleFilter !== "all" 
                ? "Try adjusting your search or filter criteria."
                : "No organizations have been registered yet."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
