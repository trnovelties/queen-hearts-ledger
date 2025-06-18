
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { useAdmin } from '@/context/AdminContext';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Users, GamepadIcon, DollarSign, Building2, Eye, Edit, Save, X } from "lucide-react";
import { format } from "date-fns";

interface Organization {
  id: string;
  email: string;
  organization_name: string | null;
  logo_url: string | null;
  about: string | null;
  role: string;
  created_at: string;
  total_games?: number;
  total_sales?: number;
  total_profit?: number;
}

interface Stats {
  totalOrganizations: number;
  totalGames: number;
  totalSales: number;
  totalProfit: number;
}

export default function AdminView() {
  const { user, isAdmin } = useAuth();
  const { switchToOrganization } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalOrganizations: 0,
    totalGames: 0,
    totalSales: 0,
    totalProfit: 0
  });
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [organizationToDelete, setOrganizationToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    
    fetchOrganizations();
  }, [isAdmin, navigate]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);

      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch games data for each organization
      const organizationsWithStats = await Promise.all(
        usersData.map(async (user) => {
          const { data: gamesData } = await supabase
            .from('games')
            .select('total_sales, organization_net_profit')
            .eq('user_id', user.id);

          const totalGames = gamesData?.length || 0;
          const totalSales = gamesData?.reduce((sum, game) => sum + (game.total_sales || 0), 0) || 0;
          const totalProfit = gamesData?.reduce((sum, game) => sum + (game.organization_net_profit || 0), 0) || 0;

          return {
            ...user,
            total_games: totalGames,
            total_sales: totalSales,
            total_profit: totalProfit
          };
        })
      );

      setOrganizations(organizationsWithStats);

      // Calculate overall stats
      const totalOrganizations = organizationsWithStats.length;
      const totalGames = organizationsWithStats.reduce((sum, org) => sum + (org.total_games || 0), 0);
      const totalSales = organizationsWithStats.reduce((sum, org) => sum + (org.total_sales || 0), 0);
      const totalProfit = organizationsWithStats.reduce((sum, org) => sum + (org.total_profit || 0), 0);

      setStats({
        totalOrganizations,
        totalGames,
        totalSales,
        totalProfit
      });

    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      toast({
        title: "Error",
        description: `Failed to fetch organizations: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrganization = (organization: Organization) => {
    switchToOrganization({
      id: organization.id,
      email: organization.email,
      organization_name: organization.organization_name,
      logo_url: organization.logo_url,
      about: organization.about,
      role: organization.role
    });
    navigate('/dashboard');
  };

  const handleEditRole = (organizationId: string, currentRole: string) => {
    setEditingRole(organizationId);
    setNewRole(currentRole);
  };

  const handleSaveRole = async (organizationId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', organizationId);

      if (error) throw error;

      toast({
        title: "Role Updated",
        description: "User role has been updated successfully."
      });

      setEditingRole(null);
      fetchOrganizations();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: `Failed to update role: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
    setNewRole('');
  };

  const handleDeleteOrganization = async () => {
    if (!organizationToDelete) return;

    try {
      // Delete all related data first
      const { error: ticketSalesError } = await supabase
        .from('ticket_sales')
        .delete()
        .eq('user_id', organizationToDelete);

      if (ticketSalesError) throw ticketSalesError;

      const { error: weeksError } = await supabase
        .from('weeks')
        .delete()
        .eq('user_id', organizationToDelete);

      if (weeksError) throw weeksError;

      const { error: expensesError } = await supabase
        .from('expenses')
        .delete()
        .eq('user_id', organizationToDelete);

      if (expensesError) throw expensesError;

      const { error: gamesError } = await supabase
        .from('games')
        .delete()
        .eq('user_id', organizationToDelete);

      if (gamesError) throw gamesError;

      const { error: configError } = await supabase
        .from('configurations')
        .delete()
        .eq('user_id', organizationToDelete);

      if (configError) throw configError;

      const { error: rulesError } = await supabase
        .from('organization_rules')
        .delete()
        .eq('user_id', organizationToDelete);

      if (rulesError) throw rulesError;

      // Finally delete the user
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', organizationToDelete);

      if (userError) throw userError;

      toast({
        title: "Organization Deleted",
        description: "Organization and all associated data have been deleted successfully."
      });

      setDeleteDialogOpen(false);
      setOrganizationToDelete(null);
      fetchOrganizations();
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      toast({
        title: "Error",
        description: `Failed to delete organization: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          Admin View
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrganizations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Games</CardTitle>
            <GamepadIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGames}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalSales)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalProfit)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Organizations Grid */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Organizations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => (
            <Card 
              key={org.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleViewOrganization(org)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      {org.logo_url ? (
                        <AvatarImage src={org.logo_url} alt="Organization logo" />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {org.organization_name?.charAt(0) || org.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {org.organization_name || 'Unnamed Organization'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground truncate">{org.email}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={org.role === 'admin' ? 'default' : 'secondary'}
                    className={org.role === 'admin' ? 'bg-red-100 text-red-800' : ''}
                  >
                    {org.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Games:</span>
                    <span className="font-medium">{org.total_games}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Sales:</span>
                    <span className="font-medium">{formatCurrency(org.total_sales || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Net Profit:</span>
                    <span className="font-medium">{formatCurrency(org.total_profit || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Joined:</span>
                    <span className="font-medium">{format(new Date(org.created_at), 'MMM d, yyyy')}</span>
                  </div>
                  {org.about && (
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground line-clamp-2">{org.about}</p>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    onClick={() => handleViewOrganization(org)}
                    size="sm"
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Organizations Table */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Organization Management</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Games</TableHead>
                  <TableHead>Total Sales</TableHead>
                  <TableHead>Net Profit</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          {org.logo_url ? (
                            <AvatarImage src={org.logo_url} alt="Organization logo" />
                          ) : null}
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {org.organization_name?.charAt(0) || org.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{org.organization_name || 'Unnamed Organization'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{org.email}</TableCell>
                    <TableCell>
                      {editingRole === org.id ? (
                        <div className="flex items-center space-x-2">
                          <Select
                            value={newRole}
                            onValueChange={(newRole: string) => setNewRole(newRole)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="organizer">Organizer</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={() => handleSaveRole(org.id)}
                            size="sm"
                            variant="outline"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={handleCancelEdit}
                            size="sm"
                            variant="outline"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={org.role === 'admin' ? 'default' : 'secondary'}
                            className={org.role === 'admin' ? 'bg-red-100 text-red-800' : ''}
                          >
                            {org.role}
                          </Badge>
                          <Button
                            onClick={() => handleEditRole(org.id, org.role)}
                            size="sm"
                            variant="ghost"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{org.total_games}</TableCell>
                    <TableCell>{formatCurrency(org.total_sales || 0)}</TableCell>
                    <TableCell>{formatCurrency(org.total_profit || 0)}</TableCell>
                    <TableCell>{format(new Date(org.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          onClick={() => handleViewOrganization(org)}
                          size="sm"
                          variant="outline"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this organization? This will permanently delete all associated games, weeks, ticket sales, expenses, and configuration data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDeleteDialogOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleDeleteOrganization} variant="destructive">
              Delete Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
