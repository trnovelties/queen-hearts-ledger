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

interface CardPayout {
  card: string;
  payout: number | "jackpot";
}

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
  
  const [cardPayouts, setCardPayouts] = useState<CardPayout[]>([
    { card: "2 of Hearts", payout: 25 },
    { card: "3 of Hearts", payout: 25 },
    { card: "4 of Hearts", payout: 25 },
    { card: "5 of Hearts", payout: 25 },
    { card: "6 of Hearts", payout: 25 },
    { card: "7 of Hearts", payout: 25 },
    { card: "8 of Hearts", payout: 25 },
    { card: "9 of Hearts", payout: 25 },
    { card: "10 of Hearts", payout: 25 },
    { card: "Jack of Hearts", payout: 30 },
    { card: "Queen of Hearts", payout: "jackpot" },
    { card: "King of Hearts", payout: 30 },
    { card: "Ace of Hearts", payout: 35 },
    // Add other suits
    { card: "Queen of Diamonds", payout: 40 },
    { card: "Queen of Clubs", payout: 40 },
    { card: "Queen of Spades", payout: 40 },
    { card: "Joker", payout: 50 },
  ]);
  
  const [loading, setLoading] = useState(false);
  
  // Fetch configuration on component mount
  useEffect(() => {
    async function fetchConfig() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('configurations')
          .select('*')
          .single();
          
        if (error) throw error;
        
        if (data) {
          setGameSettings({
            ticketPrice: data.ticket_price,
            organizationPercentage: data.organization_percentage,
            jackpotPercentage: data.jackpot_percentage,
            penaltyPercentage: data.penalty_percentage,
            penaltyToOrganization: data.penalty_to_organization || false,
            minimumStartingJackpot: data.minimum_starting_jackpot || 500
          });
          
          if (data.card_payouts) {
            const payoutsArray = Object.entries(data.card_payouts).map(([card, payout]) => ({
              card,
              payout
            }));
            setCardPayouts(payoutsArray);
          }
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
      const { error } = await supabase
        .from('configurations')
        .upsert({
          id: '1', // Use a fixed ID for the single configuration record
          ticket_price: gameSettings.ticketPrice,
          organization_percentage: gameSettings.organizationPercentage,
          jackpot_percentage: gameSettings.jackpotPercentage,
          penalty_percentage: gameSettings.penaltyPercentage,
          penalty_to_organization: gameSettings.penaltyToOrganization,
          minimum_starting_jackpot: gameSettings.minimumStartingJackpot
        });
        
      if (error) throw error;
      
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
  
  // Handle saving card payouts
  const handleSaveCardPayouts = async () => {
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
    
    setLoading(true);
    try {
      // Convert array to object format for storage
      const payoutsObject: Record<string, number | string> = {};
      cardPayouts.forEach(({ card, payout }) => {
        payoutsObject[card] = payout;
      });
      
      const { error } = await supabase
        .from('configurations')
        .upsert({
          id: '1', // Use a fixed ID for the single configuration record
          card_payouts: payoutsObject
        });
        
      if (error) throw error;
      
      toast({
        title: "Card Payouts Saved",
        description: "Card payout settings have been updated.",
      });
    } catch (error: any) {
      console.error('Error saving card payouts:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save card payouts.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Organization Settings</h1>
      
      <Tabs defaultValue="game-settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="game-settings">Game Settings</TabsTrigger>
          <TabsTrigger value="card-payouts">Card Payouts</TabsTrigger>
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
                          const org = parseFloat(e.target.value);
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
                          const jackpot = parseFloat(e.target.value);
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
                        minimumStartingJackpot: parseFloat(e.target.value)
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
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
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
                  
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setCardPayouts([...cardPayouts, { card: "", payout: 0 }]);
                      }}
                    >
                      Add Card
                    </Button>
                    <Button onClick={handleSaveCardPayouts} disabled={loading}>
                      {loading ? 'Saving...' : 'Save Card Payouts'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
