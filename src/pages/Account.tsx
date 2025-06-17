
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, Plus, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

type User = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

export default function Account() {
  const { user, profile, isAdmin, updateProfile, uploadLogo } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    organization_name: '',
    about: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // User management state (for admins)
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUserDialogOpen, setNewUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    role: "organizer",
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserRole, setEditUserRole] = useState("organizer");
  
  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        organization_name: profile.organization_name || '',
        about: profile.about || ''
      });
      if (profile.logo_url) {
        setLogoPreview(profile.logo_url);
      }
    }
  }, [profile]);
  
  // Fetch users if admin
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);
  
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      if (data) {
        setUsers(data as User[]);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      let logoUrl = profile?.logo_url || null;
      
      if (logoFile) {
        const uploadedUrl = await uploadLogo(logoFile);
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        }
      }
      
      await updateProfile({
        organization_name: formData.organization_name,
        about: formData.about,
        logo_url: logoUrl
      });
      
      toast({
        title: "Profile Updated",
        description: "Your organization profile has been updated successfully."
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: "There was an error updating your profile.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // User management functions
  const handleAddUser = async () => {
    // Validate form
    if (!newUser.email) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!newUser.password) {
      toast({
        title: "Error",
        description: "Password is required",
        variant: "destructive",
      });
      return;
    }
    
    if (newUser.password !== newUser.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create the user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            role: newUser.role
          }
        }
      });
      
      if (error) throw error;
      
      if (data.user) {
        // Update the role in the users table
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: newUser.role })
          .eq('id', data.user.id);
          
        if (updateError) throw updateError;
        
        await fetchUsers(); // Refresh user list
        
        toast({
          title: "User Created",
          description: `${newUser.email} has been added as ${newUser.role}.`,
        });
        
        // Reset form
        setNewUser({
          email: "",
          password: "",
          confirmPassword: "",
          role: "organizer",
        });
        
        setNewUserDialogOpen(false);
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserRole(user.role);
    setEditUserDialogOpen(true);
  };
  
  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    setIsLoading(true);
    
    try {
      // Update user role
      const { error } = await supabase
        .from('users')
        .update({ role: editUserRole })
        .eq('id', editingUser.id);
        
      if (error) throw error;
      
      await fetchUsers(); // Refresh user list
      
      toast({
        title: "User Updated",
        description: `${editingUser.email}'s role has been updated to ${editUserRole}.`,
      });
      
      setEditUserDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    // Check if this is the last admin
    const adminUsers = users.filter(u => u.role === "admin");
    const isLastAdmin = adminUsers.length === 1 && adminUsers[0].id === userId;
    
    if (isLastAdmin) {
      toast({
        title: "Error",
        description: "Cannot delete the last admin user",
        variant: "destructive",
      });
      return;
    }
    
    // Don't allow deleting yourself
    if (userId === user?.id) {
      toast({
        title: "Error",
        description: "You cannot delete your own account",
        variant: "destructive",
      });
      return;
    }
    
    if (confirm("Are you sure you want to delete this user?")) {
      setIsLoading(true);
      
      try {
        // Delete the user from Supabase Auth
        const { error } = await supabase.auth.admin.deleteUser(userId);
          
        if (error) throw error;
        
        await fetchUsers(); // Refresh user list
        
        toast({
          title: "User Deleted",
          description: "User has been removed.",
        });
      } catch (error: any) {
        console.error('Error deleting user:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to delete user.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-medium">Please log in to view your account</h2>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Account Settings</h1>
      </div>
      
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Organization Profile</TabsTrigger>
          {isAdmin && <TabsTrigger value="users"><Users className="h-4 w-4 mr-2" />User Management</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
              <CardDescription>Update your organization profile information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex flex-col items-center space-y-4">
                    <Avatar className="h-32 w-32">
                      {logoPreview ? (
                        <AvatarImage src={logoPreview} alt="Organization Logo" />
                      ) : (
                        <AvatarFallback className="text-2xl bg-primary/10">
                          {formData.organization_name?.charAt(0) || user?.email?.charAt(0) || '?'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                      <Label htmlFor="logo" className="text-center">Logo</Label>
                      <div className="flex justify-center">
                        <Button
                          type="button" 
                          variant="outline" 
                          onClick={() => document.getElementById('logo')?.click()}
                          className="flex gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Upload Logo
                        </Button>
                        <Input 
                          id="logo" 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileChange}
                          className="hidden" 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={user?.email || ''} 
                        disabled 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="organization_name">Organization Name</Label>
                      <Input 
                        id="organization_name" 
                        name="organization_name"
                        value={formData.organization_name} 
                        onChange={handleInputChange} 
                        placeholder="Enter your organization name" 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="about">About</Label>
                      <Textarea 
                        id="about" 
                        name="about"
                        value={formData.about} 
                        onChange={handleInputChange} 
                        placeholder="Tell us about your organization" 
                        rows={4} 
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {isAdmin && (
          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Manage users who can access this application.
                  </CardDescription>
                </div>
                
                <Dialog open={newUserDialogOpen} onOpenChange={setNewUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" /> Add User
                    </Button>
                  </DialogTrigger>
                  
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New User</DialogTitle>
                      <DialogDescription>
                        Create a new user account with the specified role.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email" 
                          type="email"
                          placeholder="user@organization.org"
                          value={newUser.email}
                          onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input 
                          id="password" 
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input 
                          id="confirmPassword" 
                          type="password"
                          value={newUser.confirmPassword}
                          onChange={(e) => setNewUser({...newUser, confirmPassword: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="role">Role</Label>
                        <select
                          id="role"
                          value={newUser.role}
                          onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="admin">Admin</option>
                          <option value="organizer">Organizer</option>
                        </select>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setNewUserDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddUser} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Create User
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              
              <CardContent>
                {loadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Email</th>
                          <th className="text-left p-2">Role</th>
                          <th className="text-left p-2">Created On</th>
                          <th className="text-right p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center p-8 text-muted-foreground">
                              No users found.
                            </td>
                          </tr>
                        ) : (
                          users.map((user) => (
                            <tr key={user.id} className="border-b hover:bg-muted/50">
                              <td className="p-2">{user.email}</td>
                              <td className="p-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  user.role === "admin" ? "bg-primary/20 text-primary" : "bg-secondary/20 text-secondary-foreground"
                                }`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="p-2">{new Date(user.created_at).toLocaleDateString()}</td>
                              <td className="p-2 text-right space-x-2">
                                <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                                  Edit
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  Delete
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Edit User Dialog */}
            <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit User</DialogTitle>
                  <DialogDescription>
                    Update the role for {editingUser?.email}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="editRole">Role</Label>
                    <select
                      id="editRole"
                      value={editUserRole}
                      onChange={(e) => setEditUserRole(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="admin">Admin</option>
                      <option value="organizer">Organizer</option>
                    </select>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditUserDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateUser} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Update User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
