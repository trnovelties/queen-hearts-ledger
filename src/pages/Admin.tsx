import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { CardPayoutConfig } from "@/components/CardPayoutConfig";
import { OrganizationRules } from "@/components/OrganizationRules";

export default function Admin() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [gameSettings, setGameSettings] = useState({
    ticketPrice: 2,
    organizationPercentage: 40,
    jackpotPercentage: 60,
    penaltyPercentage: 10,
    penaltyToOrganization: false,
    minimumStartingJackpot: 500
  });
  
  const [loading, setLoading] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  
  // Fetch configuration on component mount
  useEffect(() => {
    async function fetchConfig() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('configurations')
          .select('*')
          .limit(1)
          .maybeSingle();
          
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        
        if (data) {
          setConfigId(data.id);
          setGameSettings({
            ticketPrice: data.ticket_price,
            organizationPercentage: data.organization_percentage,
            jackpotPercentage: data.jackpot_percentage,
            penaltyPercentage: data.penalty_percentage,
            penaltyToOrganization: data.penalty_to_organization || false,
            minimumStartingJackpot: data.minimum_starting_jackpot || 500
          });
        }
      } catch (error: any) {
        console.error('Error fetching configuration:', error);
        toast({
          title: "Error",
          description: "Failed to load configuration settings.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchConfig();
  }, [toast]);
  
  // Handle saving game settings
  const handleSaveGameSettings = async () => {
    // Validate percentages
    if (gameSettings.organizationPercentage + gameSettings.jackpotPercentage !== 100) {
      toast({
        title: "Validation Error",
        description: "Organization and Jackpot percentages must add up to 100%.",
        variant: "destructive",
      });
      return;
    }
    
    if (gameSettings.ticketPrice <= 0) {
      toast({
        title: "Validation Error",
        description: "Ticket price must be greater than zero.",
        variant: "destructive",
      });
      return;
    }
    
    if (gameSettings.minimumStartingJackpot < 0) {
      toast({
        title: "Validation Error",
        description: "Minimum starting jackpot cannot be negative.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      const configData = {
        ticket_price: gameSettings.ticketPrice,
        organization_percentage: gameSettings.organizationPercentage,
        jackpot_percentage: gameSettings.jackpotPercentage,
        penalty_percentage: gameSettings.penaltyPercentage,
        penalty_to_organization: gameSettings.penaltyToOrganization,
        minimum_starting_jackpot: gameSettings.minimumStartingJackpot,
        updated_at: new Date().toISOString()
      };

      let result;
      if (configId) {
        // Update existing configuration
        result = await supabase
          .from('configurations')
          .update(configData)
          .eq('id', configId);
      } else {
        // Insert new configuration
        result = await supabase
          .from('configurations')
          .insert(configData)
          .select()
          .single();
        
        if (result.data) {
          setConfigId(result.data.id);
        }
      }
        
      if (result.error) throw result.error;
      
      toast({
        title: "Settings Saved",
        description: "Default game settings have been updated.",
      });
    } catch (error: any) {
      console.error('Error saving game settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>
      
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">Game Settings</TabsTrigger>
          <TabsTrigger value="distributions">Card Distributions</TabsTrigger>
          <TabsTrigger value="rules">Organization Rules</TabsTrigger>
        </TabsList>
        
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Game Settings</CardTitle>
              <CardDescription>
                Configure default settings for new Queen of Hearts games.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          ticketPrice: parseFloat(e.target.value) || 0
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
                          penaltyPercentage: parseFloat(e.target.value) || 0
                        })}
                      />
                      <p className="text-sm text-muted-foreground">
                        Amount deducted if winner is not present
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="organizationPercentage">Organization Percentage (%)</Label>
                      <Input
                        id="organizationPercentage"
                        type="number"
                        min="0"
                        max="100"
                        value={gameSettings.organizationPercentage}
                        onChange={(e) => {
                          const org = parseFloat(e.target.value) || 0;
                          setGameSettings({
                            ...gameSettings,
                            organizationPercentage: org,
                            jackpotPercentage: 100 - org
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
                          const jackpot = parseFloat(e.target.value) || 0;
                          setGameSettings({
                            ...gameSettings,
                            jackpotPercentage: jackpot,
                            organizationPercentage: 100 - jackpot
                          });
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="minimumStartingJackpot">Minimum Starting Jackpot ($)</Label>
                    <Input
                      id="minimumStartingJackpot"
                      type="number"
                      min="0"
                      step="0.01"
                      value={gameSettings.minimumStartingJackpot}
                      onChange={(e) => setGameSettings({
                        ...gameSettings,
                        minimumStartingJackpot: parseFloat(e.target.value) || 0
                      })}
                    />
                    <p className="text-sm text-muted-foreground">
                      The minimum amount for a new game's jackpot
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="penaltyToOrganization"
                      checked={gameSettings.penaltyToOrganization}
                      onCheckedChange={(checked) => setGameSettings({
                        ...gameSettings,
                        penaltyToOrganization: checked
                      })}
                    />
                    <Label htmlFor="penaltyToOrganization">
                      Add penalty to organization funds (otherwise, rolls over to next jackpot)
                    </Label>
                  </div>
                  
                  <Button onClick={handleSaveGameSettings} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Settings'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="distributions" className="space-y-6">
          <CardPayoutConfig />
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <OrganizationRules />
        </TabsContent>
      </Tabs>
    </div>
  );
}
