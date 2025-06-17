import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { CardDistributionConfig } from "@/components/CardPayoutConfig";

export default function Admin() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [ticketPrice, setTicketPrice] = useState(2);
  const [organizationPercentage, setOrganizationPercentage] = useState(40);
  const [jackpotPercentage, setJackpotPercentage] = useState(60);
  const [penaltyPercentage, setPenaltyPercentage] = useState(10);
  const [penaltyToOrganization, setPenaltyToOrganization] = useState(false);
	const [minimumStartingJackpot, setMinimumStartingJackpot] = useState(500);

  useEffect(() => {
    if (!isAdmin) return;
    fetchConfig();
  }, [isAdmin]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('configurations')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching configuration:', error);
        toast({
          title: "Error",
          description: "Failed to load game settings.",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setConfigId(data.id);
        setTicketPrice(data.ticket_price || 2);
        setOrganizationPercentage(data.organization_percentage || 40);
        setJackpotPercentage(data.jackpot_percentage || 60);
        setPenaltyPercentage(data.penalty_percentage || 10);
        setPenaltyToOrganization(data.penalty_to_organization || false);
				setMinimumStartingJackpot(data.minimum_starting_jackpot || 500);
      }
    } catch (error: any) {
      console.error('Error in fetchConfig:', error);
      toast({
        title: "Error",
        description: "Failed to load game settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGameSettings = async () => {
    setLoading(true);
    try {
      const updates = {
        ticket_price: ticketPrice,
        organization_percentage: organizationPercentage,
        jackpot_percentage: jackpotPercentage,
        penalty_percentage: penaltyPercentage,
        penalty_to_organization: penaltyToOrganization,
				minimum_starting_jackpot: minimumStartingJackpot,
        updated_at: new Date().toISOString(),
      };

      let response;
      if (configId) {
        response = await supabase
          .from('configurations')
          .update(updates)
          .eq('id', configId);
      } else {
        response = await supabase
          .from('configurations')
          .insert([updates]);
      }

      if (response.error) {
        throw response.error;
      }

      toast({
        title: "Game Settings Saved",
        description: "Game settings have been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error saving game settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save game settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
      <div>
        <h1 className="text-2xl font-bold">Admin Configuration</h1>
        <p className="text-muted-foreground">Manage game settings and card distributions</p>
      </div>

      {/* Game Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Game Settings</CardTitle>
          <CardDescription>Configure the core settings for the Queen of Hearts game.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ticketPrice">Ticket Price</Label>
              <Input
                type="number"
                id="ticketPrice"
                value={ticketPrice}
                onChange={(e) => setTicketPrice(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="minimumStartingJackpot">Minimum Starting Jackpot</Label>
              <Input
                type="number"
                id="minimumStartingJackpot"
                value={minimumStartingJackpot}
                onChange={(e) => setMinimumStartingJackpot(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="organizationPercentage">Organization (%)</Label>
              <Input
                type="number"
                id="organizationPercentage"
                value={organizationPercentage}
                onChange={(e) => setOrganizationPercentage(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="jackpotPercentage">Jackpot (%)</Label>
              <Input
                type="number"
                id="jackpotPercentage"
                value={jackpotPercentage}
                onChange={(e) => setJackpotPercentage(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="penaltyPercentage">Penalty (%)</Label>
              <Input
                type="number"
                id="penaltyPercentage"
                value={penaltyPercentage}
                onChange={(e) => setPenaltyPercentage(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="penaltyToOrganization"
              checked={penaltyToOrganization}
              onCheckedChange={(checked) => setPenaltyToOrganization(checked)}
            />
            <Label htmlFor="penaltyToOrganization">Send Penalty to Organization</Label>
          </div>
          <Button onClick={handleSaveGameSettings} disabled={loading}>
            {loading ? 'Saving...' : 'Save Game Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Card Distributions Configuration */}
      <CardDistributionConfig />
    </div>
  );
}
