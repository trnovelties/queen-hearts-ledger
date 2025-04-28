
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface CardPayout {
  card: string;
  payout: number | "jackpot";
}

export default function Admin() {
  const { toast } = useToast();
  const [gameSettings, setGameSettings] = useState({
    ticketPrice: 2,
    lodgePercentage: 40,
    jackpotPercentage: 60,
    penaltyPercentage: 10,
    penaltyToLodge: false
  });
  
  const [cardPayouts, setCardPayouts] = useState<CardPayout[]>([
    { card: "2 of Hearts", payout: 10 },
    { card: "3 of Hearts", payout: 11 },
    { card: "4 of Hearts", payout: 8 },
    { card: "5 of Hearts", payout: 10 },
    { card: "Queen of Hearts", payout: "jackpot" },
    { card: "Joker", payout: 100 },
    // More cards would be added here
  ]);
  
  const [users, setUsers] = useState([
    { id: "1", email: "admin@example.com", role: "admin" },
    { id: "2", email: "organizer@example.com", role: "organizer" },
  ]);
  
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    role: "organizer"
  });
  
  // Handle saving game settings
  const handleSaveGameSettings = () => {
    // Validate percentages
    if (gameSettings.lodgePercentage + gameSettings.jackpotPercentage !== 100) {
      toast({
        title: "Validation Error",
        description: "Lodge and Jackpot percentages must add up to 100%.",
        variant: "destructive",
      });
      return;
    }
    
    // In a real app, this would save to the database
    toast({
      title: "Settings Saved",
      description: "Default game settings have been updated.",
    });
  };
  
  // Handle saving card payouts
  const handleSaveCardPayouts = () => {
    // Validate card payouts
    const invalidCardPayouts = cardPayouts.filter(
      card => !card.card || (typeof card.payout === "number" && card.payout < 0)
    );
    
    if (invalidCardPayouts.length > 0) {
      toast({
        title: "Validation Error",
        description: "Card payouts must have a valid card name and non-negative payout.",
        variant: "destructive",
      });
      return;
    }
    
    // In a real app, this would save to the database
    toast({
      title: "Card Payouts Saved",
      description: "Card payout settings have been updated.",
    });
  };
  
  // Handle adding a new user
  const handleAddUser = () => {
    if (!newUser.email || !newUser.password) {
      toast({
        title: "Validation Error",
        description: "Email and password are required.",
        variant: "destructive",
      });
      return;
    }
    
    // In a real app, this would create the user in Supabase Auth
    const newUserObj = {
      id: Math.random().toString(36).substring(2, 9),
      email: newUser.email,
      role: newUser.role
    };
    
    setUsers([...users, newUserObj]);
    setNewUserOpen(false);
    setNewUser({
      email: "",
      password: "",
      role: "organizer"
    });
    
    toast({
      title: "User Created",
      description: `${newUser.email} has been added as ${newUser.role}.`,
    });
  };
  
  // Handle updating user role
  const handleUpdateRole = (id: string, newRole: string) => {
    const updatedUsers = users.map(user => 
      user.id === id ? { ...user, role: newRole } : user
    );
    setUsers(updatedUsers);
    
    toast({
      title: "Role Updated",
      description: `User role has been updated to ${newRole}.`,
    });
  };
  
  // Handle deleting a user
  const handleDeleteUser = (id: string) => {
    const userToDelete = users.find(user => user.id === id);
    
    if (!userToDelete) return;
    
    // Prevent deleting the last admin
    if (userToDelete.role === "admin" && users.filter(u => u.role === "admin").length === 1) {
      toast({
        title: "Cannot Delete",
        description: "You cannot delete the last admin user.",
        variant: "destructive",
      });
      return;
    }
    
    // In a real app, this would delete the user from Supabase Auth
    setUsers(users.filter(user => user.id !== id));
    
    toast({
      title: "User Deleted",
      description: `${userToDelete.email} has been removed.`,
    });
  };
  
  return (
    <Tabs defaultValue="game-settings" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="game-settings">Game Settings</TabsTrigger>
        <TabsTrigger value="card-payouts">Card Payouts</TabsTrigger>
        <TabsTrigger value="manage-users">Manage Users</TabsTrigger>
      </TabsList>
      
      {/* Game Settings Tab */}
      <TabsContent value="game-settings" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Default Game Settings</CardTitle>
            <CardDescription>
              Configure default settings for new Queen of Hearts games.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="ticketPrice">Default Ticket Price ($)</Label>
                <Input
                  id="ticketPrice"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={gameSettings.ticketPrice}
                  onChange={(e) => setGameSettings({
                    ...gameSettings,
                    ticketPrice: parseFloat(e.target.value)
                  })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="penaltyPercentage">Penalty Percentage (%)</Label>
                <Input
                  id="penaltyPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={gameSettings.penaltyPercentage}
                  onChange={(e) => setGameSettings({
                    ...gameSettings,
                    penaltyPercentage: parseFloat(e.target.value)
                  })}
                />
                <p className="text-sm text-muted-foreground">
                  Amount deducted if winner is not present
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="lodgePercentage">Lodge Percentage (%)</Label>
                <Input
                  id="lodgePercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={gameSettings.lodgePercentage}
                  onChange={(e) => {
                    const lodge = parseFloat(e.target.value);
                    setGameSettings({
                      ...gameSettings,
                      lodgePercentage: lodge,
                      jackpotPercentage: 100 - lodge
                    });
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="jackpotPercentage">Jackpot Percentage (%)</Label>
                <Input
                  id="jackpotPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={gameSettings.jackpotPercentage}
                  onChange={(e) => {
                    const jackpot = parseFloat(e.target.value);
                    setGameSettings({
                      ...gameSettings,
                      jackpotPercentage: jackpot,
                      lodgePercentage: 100 - jackpot
                    });
                  }}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="penaltyToLodge"
                checked={gameSettings.penaltyToLodge}
                onCheckedChange={(checked) => setGameSettings({
                  ...gameSettings,
                  penaltyToLodge: checked
                })}
              />
              <Label htmlFor="penaltyToLodge">
                Add penalty to lodge funds (otherwise, rolls over to next jackpot)
              </Label>
            </div>
            
            <Button onClick={handleSaveGameSettings}>Save Settings</Button>
          </CardContent>
        </Card>
      </TabsContent>
      
      {/* Card Payouts Tab */}
      <TabsContent value="card-payouts" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Card Payout Configuration</CardTitle>
            <CardDescription>
              Set payout amounts for each card in the deck.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left">Card</th>
                      <th className="py-2 text-left">Payout ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardPayouts.map((cardPayout, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-2">
                          <Input
                            value={cardPayout.card}
                            onChange={(e) => {
                              const updatedPayouts = [...cardPayouts];
                              updatedPayouts[index].card = e.target.value;
                              setCardPayouts(updatedPayouts);
                            }}
                          />
                        </td>
                        <td className="py-2">
                          {cardPayout.payout === "jackpot" ? (
                            <Input
                              value="jackpot"
                              disabled
                              className="bg-muted text-muted-foreground"
                            />
                          ) : (
                            <Input
                              type="number"
                              min="0"
                              value={cardPayout.payout}
                              onChange={(e) => {
                                const updatedPayouts = [...cardPayouts];
                                updatedPayouts[index].payout = parseFloat(e.target.value);
                                setCardPayouts(updatedPayouts);
                              }}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <Button 
                variant="outline" 
                className="mr-2"
                onClick={() => {
                  setCardPayouts([...cardPayouts, { card: "", payout: 0 }]);
                }}
              >
                Add Card
              </Button>
              <Button onClick={handleSaveCardPayouts}>Save Card Payouts</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      {/* Manage Users Tab */}
      <TabsContent value="manage-users" className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage users who can access this application.
              </CardDescription>
            </div>
            
            <Dialog open={newUserOpen} onOpenChange={setNewUserOpen}>
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
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({
                        ...newUser,
                        email: e.target.value
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({
                        ...newUser,
                        password: e.target.value
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <select
                      id="role"
                      value={newUser.role}
                      onChange={(e) => setNewUser({
                        ...newUser,
                        role: e.target.value
                      })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="admin">Admin</option>
                      <option value="organizer">Organizer</option>
                    </select>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button type="submit" onClick={handleAddUser}>Add User</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left">Email</th>
                    <th className="py-2 text-left">Role</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b">
                      <td className="py-3">{user.email}</td>
                      <td className="py-3">
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                          className="bg-transparent border-0 focus:ring-0"
                        >
                          <option value="admin">Admin</option>
                          <option value="organizer">Organizer</option>
                        </select>
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
