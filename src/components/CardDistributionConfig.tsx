
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type CardDistributions = {
  [key: string]: number | string;
};

export function CardDistributionConfig() {
  const { toast } = useToast();
  const [cardDistributions, setCardDistributions] = useState<CardDistributions>({});
  const [loading, setLoading] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  
  // Fetch card distributions on component mount
  useEffect(() => {
    async function fetchCardDistributions() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('configurations')
          .select('id, card_payouts')
          .limit(1)
          .maybeSingle();
          
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        
        if (data) {
          setConfigId(data.id);
          // Properly handle the card_payouts data
          if (data.card_payouts) {
            if (typeof data.card_payouts === 'string') {
              try {
                setCardDistributions(JSON.parse(data.card_payouts));
              } catch {
                setCardDistributions(getDefaultCardDistributions());
              }
            } else if (typeof data.card_payouts === 'object' && data.card_payouts !== null) {
              setCardDistributions(data.card_payouts as CardDistributions);
            } else {
              setCardDistributions(getDefaultCardDistributions());
            }
          } else {
            setCardDistributions(getDefaultCardDistributions());
          }
        } else {
          // Set default card distributions if no configuration exists
          setCardDistributions(getDefaultCardDistributions());
        }
      } catch (error: any) {
        console.error('Error fetching card distributions:', error);
        toast({
          title: "Error",
          description: "Failed to load card distributions.",
          variant: "destructive",
        });
        // Set defaults on error
        setCardDistributions(getDefaultCardDistributions());
      } finally {
        setLoading(false);
      }
    }
    
    fetchCardDistributions();
  }, [toast]);
  
  // Default card distribution values
  const getDefaultCardDistributions = (): CardDistributions => ({
    "2 of Hearts": 10,
    "3 of Hearts": 11,
    "4 of Hearts": 8,
    "5 of Hearts": 12,
    "6 of Hearts": 9,
    "7 of Hearts": 10,
    "8 of Hearts": 10,
    "9 of Hearts": 5,
    "10 of Hearts": 20,
    "Jack of Hearts": 25,
    "Queen of Hearts": "jackpot",
    "King of Hearts": 15,
    "Ace of Hearts": 30,
    "2 of Diamonds": 10,
    "3 of Diamonds": 11,
    "4 of Diamonds": 8,
    "5 of Diamonds": 12,
    "6 of Diamonds": 9,
    "7 of Diamonds": 10,
    "8 of Diamonds": 10,
    "9 of Diamonds": 5,
    "10 of Diamonds": 20,
    "Jack of Diamonds": 25,
    "Queen of Diamonds": 40,
    "King of Diamonds": 15,
    "Ace of Diamonds": 30,
    "2 of Clubs": 10,
    "3 of Clubs": 11,
    "4 of Clubs": 8,
    "5 of Clubs": 12,
    "6 of Clubs": 9,
    "7 of Clubs": 10,
    "8 of Clubs": 10,
    "9 of Clubs": 5,
    "10 of Clubs": 20,
    "Jack of Clubs": 25,
    "Queen of Clubs": 40,
    "King of Clubs": 15,
    "Ace of Clubs": 30,
    "2 of Spades": 10,
    "3 of Spades": 11,
    "4 of Spades": 8,
    "5 of Spades": 12,
    "6 of Spades": 9,
    "7 of Spades": 10,
    "8 of Spades": 10,
    "9 of Spades": 5,
    "10 of Spades": 20,
    "Jack of Spades": 25,
    "Queen of Spades": 40,
    "King of Spades": 15,
    "Ace of Spades": 30,
    "Joker": 100,
  });
  
  // Handle saving card distributions
  const handleSaveCardDistributions = async () => {
    setLoading(true);
    try {
      const configData = {
        card_payouts: cardDistributions,
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
        // Insert new configuration with default values
        result = await supabase
          .from('configurations')
          .insert({
            ...configData,
            ticket_price: 2,
            organization_percentage: 40,
            jackpot_percentage: 60,
            penalty_percentage: 10,
            penalty_to_organization: false,
            minimum_starting_jackpot: 500
          })
          .select()
          .single();
        
        if (result.data) {
          setConfigId(result.data.id);
        }
      }
        
      if (result.error) throw result.error;
      
      toast({
        title: "Card Distributions Saved",
        description: "Card distribution amounts have been updated.",
      });
    } catch (error: any) {
      console.error('Error saving card distributions:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save card distributions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle input changes
  const handleCardDistributionChange = (card: string, value: string) => {
    setCardDistributions(prev => ({
      ...prev,
      [card]: card === "Queen of Hearts" ? "jackpot" : parseFloat(value) || 0
    }));
  };
  
  // Group cards by suit
  const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace'];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Card Distribution Amounts</CardTitle>
        <CardDescription>
          Configure the distribution amounts for each card in the Queen of Hearts game.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {suits.map(suit => (
              <div key={suit} className="space-y-4">
                <h3 className="text-lg font-semibold text-primary border-b pb-2">
                  {suit}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {ranks.map(rank => {
                    const cardName = `${rank} of ${suit}`;
                    const isQueenOfHearts = cardName === "Queen of Hearts";
                    return (
                      <div key={cardName} className="space-y-2">
                        <Label htmlFor={cardName} className="text-sm font-medium">
                          {cardName}
                        </Label>
                        <Input
                          id={cardName}
                          type={isQueenOfHearts ? "text" : "number"}
                          min={isQueenOfHearts ? undefined : "0"}
                          step={isQueenOfHearts ? undefined : "0.01"}
                          value={cardDistributions[cardName] || (isQueenOfHearts ? "jackpot" : 0)}
                          onChange={(e) => handleCardDistributionChange(cardName, e.target.value)}
                          disabled={isQueenOfHearts}
                          className={isQueenOfHearts ? "bg-yellow-50 font-bold" : ""}
                          placeholder={isQueenOfHearts ? "Full Jackpot" : "0.00"}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* Joker */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary border-b pb-2">
                Special Cards
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="Joker" className="text-sm font-medium">
                    Joker
                  </Label>
                  <Input
                    id="Joker"
                    type="number"
                    min="0"
                    step="0.01"
                    value={cardDistributions["Joker"] || 0}
                    onChange={(e) => handleCardDistributionChange("Joker", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            
            <Button onClick={handleSaveCardDistributions} disabled={loading}>
              {loading ? 'Saving...' : 'Save Card Distributions'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
