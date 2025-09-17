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
import { useAdmin } from "@/context/AdminContext";
import { CardPayoutConfig } from "@/components/CardPayoutConfig";
export default function Admin() {
  const {
    toast
  } = useToast();
  const {
    user,
    isAdmin
  } = useAuth();
  const {
    viewingOrganization,
    isViewingOtherOrganization
  } = useAdmin();
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
    if (user?.id) {
      fetchConfig();
    }
  }, [user?.id, viewingOrganization, isViewingOtherOrganization]);
  const fetchConfig = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Determine which user's config to fetch
      const targetUserId = isViewingOtherOrganization && viewingOrganization ? viewingOrganization.id : user.id;
      console.log('Fetching config for user:', targetUserId);
      const {
        data,
        error
      } = await supabase.from('configurations').select('*').eq('user_id', targetUserId).limit(1).maybeSingle();
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
      } else {
        // No config found, reset to defaults
        setConfigId(null);
        setGameSettings({
          ticketPrice: 2,
          organizationPercentage: 40,
          jackpotPercentage: 60,
          penaltyPercentage: 10,
          penaltyToOrganization: false,
          minimumStartingJackpot: 500
        });
      }
    } catch (error: any) {
      console.error('Error fetching configuration:', error);
      toast({
        title: "Error",
        description: "Failed to load configuration settings.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle saving game settings
  const handleSaveGameSettings = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to save configurations.",
        variant: "destructive"
      });
      return;
    }

    // Determine which user's config to save
    const targetUserId = isViewingOtherOrganization && viewingOrganization ? viewingOrganization.id : user.id;

    // Validate percentages
    if (gameSettings.organizationPercentage + gameSettings.jackpotPercentage !== 100) {
      toast({
        title: "Validation Error",
        description: "Organization and Jackpot percentages must add up to 100%.",
        variant: "destructive"
      });
      return;
    }
    if (gameSettings.ticketPrice <= 0) {
      toast({
        title: "Validation Error",
        description: "Ticket price must be greater than zero.",
        variant: "destructive"
      });
      return;
    }
    if (gameSettings.minimumStartingJackpot < 0) {
      toast({
        title: "Validation Error",
        description: "Minimum starting jackpot cannot be negative.",
        variant: "destructive"
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
        user_id: targetUserId,
        updated_at: new Date().toISOString()
      };
      let result;
      if (configId) {
        // Update existing configuration
        result = await supabase.from('configurations').update(configData).eq('id', configId).eq('user_id', targetUserId);
      } else {
        // Insert new configuration
        result = await supabase.from('configurations').insert(configData).select().single();
        if (result.data) {
          setConfigId(result.data.id);
        }
      }
      if (result.error) throw result.error;
      toast({
        title: "Settings Saved",
        description: `Default game settings have been updated${isViewingOtherOrganization ? ` for ${viewingOrganization?.organization_name || viewingOrganization?.email}` : ''}.`
      });
    } catch (error: any) {
      console.error('Error saving game settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <div className="container mx-auto px-4 py-8">
      
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Game Settings</CardTitle>
            <CardDescription>
              Configure default settings for new games and jackpot distribution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="ticketPrice">Default Ticket Price ($)</Label>
                <Input id="ticketPrice" type="number" step="0.01" min="0" value={gameSettings.ticketPrice} onChange={e => setGameSettings({
                ...gameSettings,
                ticketPrice: parseFloat(e.target.value) || 0
              })} disabled={loading} />
              </div>

              <div>
                <Label htmlFor="minimumStartingJackpot">Minimum Starting Jackpot ($)</Label>
                <Input id="minimumStartingJackpot" type="number" step="0.01" min="0" value={gameSettings.minimumStartingJackpot} onChange={e => setGameSettings({
                ...gameSettings,
                minimumStartingJackpot: parseFloat(e.target.value) || 0
              })} disabled={loading} />
              </div>

              <div>
                <Label htmlFor="organizationPercentage">Organization Percentage (%)</Label>
                <Input id="organizationPercentage" type="number" min="0" max="100" value={gameSettings.organizationPercentage} onChange={e => setGameSettings({
                ...gameSettings,
                organizationPercentage: parseInt(e.target.value) || 0,
                jackpotPercentage: 100 - (parseInt(e.target.value) || 0)
              })} disabled={loading} />
              </div>

              <div>
                <Label htmlFor="jackpotPercentage">Jackpot Percentage (%)</Label>
                <Input id="jackpotPercentage" type="number" min="0" max="100" value={gameSettings.jackpotPercentage} onChange={e => setGameSettings({
                ...gameSettings,
                jackpotPercentage: parseInt(e.target.value) || 0,
                organizationPercentage: 100 - (parseInt(e.target.value) || 0)
              })} disabled={loading} />
              </div>

              <div>
                <Label htmlFor="penaltyPercentage">Penalty Percentage (%)</Label>
                <Input id="penaltyPercentage" type="number" min="0" max="100" value={gameSettings.penaltyPercentage} onChange={e => setGameSettings({
                ...gameSettings,
                penaltyPercentage: parseInt(e.target.value) || 0
              })} disabled={loading} />
              </div>

              
            </div>

            <Button onClick={handleSaveGameSettings} disabled={loading}>
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>

        <CardPayoutConfig />
      </div>
    </div>;
}