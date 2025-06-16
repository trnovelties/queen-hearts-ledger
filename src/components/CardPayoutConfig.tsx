import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CardPayout {
  card: string;
  payout: number | "jackpot" | "";
}

export function CardPayoutConfig() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  
  // Initialize with all standard 54 cards
  const [cardPayouts, setCardPayouts] = useState<CardPayout[]>([
    // Hearts
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
    // Diamonds
    { card: "2 of Diamonds", payout: 25 },
    { card: "3 of Diamonds", payout: 25 },
    { card: "4 of Diamonds", payout: 25 },
    { card: "5 of Diamonds", payout: 25 },
    { card: "6 of Diamonds", payout: 25 },
    { card: "7 of Diamonds", payout: 25 },
    { card: "8 of Diamonds", payout: 25 },
    { card: "9 of Diamonds", payout: 25 },
    { card: "10 of Diamonds", payout: 25 },
    { card: "Jack of Diamonds", payout: 30 },
    { card: "Queen of Diamonds", payout: 40 },
    { card: "King of Diamonds", payout: 30 },
    { card: "Ace of Diamonds", payout: 35 },
    // Clubs
    { card: "2 of Clubs", payout: 25 },
    { card: "3 of Clubs", payout: 25 },
    { card: "4 of Clubs", payout: 25 },
    { card: "5 of Clubs", payout: 25 },
    { card: "6 of Clubs", payout: 25 },
    { card: "7 of Clubs", payout: 25 },
    { card: "8 of Clubs", payout: 25 },
    { card: "9 of Clubs", payout: 25 },
    { card: "10 of Clubs", payout: 25 },
    { card: "Jack of Clubs", payout: 30 },
    { card: "Queen of Clubs", payout: 40 },
    { card: "King of Clubs", payout: 30 },
    { card: "Ace of Clubs", payout: 35 },
    // Spades
    { card: "2 of Spades", payout: 25 },
    { card: "3 of Spades", payout: 25 },
    { card: "4 of Spades", payout: 25 },
    { card: "5 of Spades", payout: 25 },
    { card: "6 of Spades", payout: 25 },
    { card: "7 of Spades", payout: 25 },
    { card: "8 of Spades", payout: 25 },
    { card: "9 of Spades", payout: 25 },
    { card: "10 of Spades", payout: 25 },
    { card: "Jack of Spades", payout: 30 },
    { card: "Queen of Spades", payout: 40 },
    { card: "King of Spades", payout: 30 },
    { card: "Ace of Spades", payout: 35 },
    // Jokers
    { card: "Joker", payout: 50 },
  ]);
  
  // Fetch configuration on component mount
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('configurations')
        .select('*')
        .limit(1)
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching configuration:', error);
        return;
      }
      
      if (data) {
        setConfigId(data.id);
        
        if (data.card_payouts) {
          try {
            // Parse the card payouts from the database
            const payoutsData = typeof data.card_payouts === 'string' 
              ? JSON.parse(data.card_payouts) 
              : data.card_payouts;
            
            const payoutsArray: CardPayout[] = Object.entries(payoutsData).map(([card, payout]) => ({
              card,
              payout: payout === 'jackpot' ? 'jackpot' : Number(payout)
            }));
            
            if (payoutsArray.length > 0) {
              setCardPayouts(payoutsArray);
            }
          } catch (parseError) {
            console.error('Error parsing card payouts:', parseError);
            toast({
              title: "Warning",
              description: "Could not parse existing card payouts. Using defaults.",
              variant: "destructive",
            });
          }
        }
      }
    } catch (error: any) {
      console.error('Error in fetchConfig:', error);
      toast({
        title: "Error",
        description: "Failed to load configuration settings.",
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
      card => !card.card.trim() || (typeof card.payout === "number" && (isNaN(card.payout) || card.payout < 0))
    );
    
    if (invalidCardPayouts.length > 0) {
      toast({
        title: "Validation Error",
        description: "All cards must have a valid name and non-negative payout amount.",
        variant: "destructive",
      });
      return;
    }
    
    // Check for duplicate cards
    const cardNames = cardPayouts.map(c => c.card.trim().toLowerCase());
    const duplicates = cardNames.filter((name, index) => cardNames.indexOf(name) !== index);
    
    if (duplicates.length > 0) {
      toast({
        title: "Validation Error",
        description: "Duplicate card names found. Each card must be unique.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      // Convert array to object format for storage
      const payoutsObject: Record<string, number | string> = {};
      cardPayouts.forEach(({ card, payout }) => {
        const trimmedCard = card.trim();
        if (trimmedCard) {
          payoutsObject[trimmedCard] = payout;
        }
      });
      
      const configData = {
        card_payouts: payoutsObject,
        updated_at: new Date().toISOString()
      };

      let result;
      if (configId) {
        // Update existing configuration
        result = await supabase
          .from('configurations')
          .update(configData)
          .eq('id', configId)
          .select();
      } else {
        // Insert new configuration with minimal required fields
        const newConfigData = {
          ...configData,
          ticket_price: 2,
          organization_percentage: 40,
          jackpot_percentage: 60,
          penalty_percentage: 10,
          penalty_to_organization: false,
          minimum_starting_jackpot: 500
        };
        
        result = await supabase
          .from('configurations')
          .insert(newConfigData)
          .select();
        
        if (result.data && result.data.length > 0) {
          const newId = result.data[0].id;
          setConfigId(newId);
        }
      }
        
      if (result.error) {
        throw result.error;
      }
      
      toast({
        title: "Card Payouts Saved",
        description: "Card payout settings have been updated successfully.",
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
  
  // Handle updating a card payout
  const updateCardPayout = (index: number, field: 'card' | 'payout', value: string | number) => {
    const updatedPayouts = [...cardPayouts];
    if (field === 'card') {
      updatedPayouts[index].card = value as string;
    } else {
      if (value === 'jackpot') {
        updatedPayouts[index].payout = 'jackpot';
      } else if (value === '' || value === null || value === undefined) {
        updatedPayouts[index].payout = '';
      } else {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        updatedPayouts[index].payout = isNaN(numValue) ? '' : numValue;
      }
    }
    setCardPayouts(updatedPayouts);
  };
  
  // Handle removing a card
  const removeCard = (index: number) => {
    const updatedPayouts = cardPayouts.filter((_, i) => i !== index);
    setCardPayouts(updatedPayouts);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Card Payout Configuration</CardTitle>
        <CardDescription>
          Set payout amounts for each card in the deck. The Queen of Hearts is always set to "jackpot".
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="py-2 text-left">Card</th>
                    <th className="py-2 text-left">Payout ($)</th>
                    <th className="py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cardPayouts.map((cardPayout, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 pr-2">
                        <Input
                          value={cardPayout.card}
                          onChange={(e) => updateCardPayout(index, 'card', e.target.value)}
                          placeholder="e.g., Ace of Hearts"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        {cardPayout.card === "Queen of Hearts" ? (
                          <Input
                            value="jackpot"
                            disabled
                            className="bg-muted text-muted-foreground"
                          />
                        ) : (
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={cardPayout.payout === '' ? '' : cardPayout.payout.toString()}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Allow empty value or valid decimal numbers
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                updateCardPayout(index, 'payout', value === '' ? '' : value);
                              }
                            }}
                            placeholder="25.00"
                          />
                        )}
                      </td>
                      <td className="py-2">
                        {cardPayout.card !== "Queen of Hearts" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeCard(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
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
                  setCardPayouts([...cardPayouts, { card: "", payout: "" }]);
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
  );
}
