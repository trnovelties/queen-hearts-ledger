
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

interface CardDistribution {
  card: string;
  distribution: number | "jackpot" | "";
}

export function CardDistributionConfig() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [configVersion, setConfigVersion] = useState<number>(1);
  
  // Initialize with all standard 54 cards
  const [cardDistributions, setCardDistributions] = useState<CardDistribution[]>([
    // Hearts
    { card: "2 of Hearts", distribution: 25 },
    { card: "3 of Hearts", distribution: 25 },
    { card: "4 of Hearts", distribution: 25 },
    { card: "5 of Hearts", distribution: 25 },
    { card: "6 of Hearts", distribution: 25 },
    { card: "7 of Hearts", distribution: 25 },
    { card: "8 of Hearts", distribution: 25 },
    { card: "9 of Hearts", distribution: 25 },
    { card: "10 of Hearts", distribution: 25 },
    { card: "Jack of Hearts", distribution: 30 },
    { card: "Queen of Hearts", distribution: "jackpot" },
    { card: "King of Hearts", distribution: 30 },
    { card: "Ace of Hearts", distribution: 35 },
    // Diamonds
    { card: "2 of Diamonds", distribution: 25 },
    { card: "3 of Diamonds", distribution: 25 },
    { card: "4 of Diamonds", distribution: 25 },
    { card: "5 of Diamonds", distribution: 25 },
    { card: "6 of Diamonds", distribution: 25 },
    { card: "7 of Diamonds", distribution: 25 },
    { card: "8 of Diamonds", distribution: 25 },
    { card: "9 of Diamonds", distribution: 25 },
    { card: "10 of Diamonds", distribution: 25 },
    { card: "Jack of Diamonds", distribution: 30 },
    { card: "Queen of Diamonds", distribution: 40 },
    { card: "King of Diamonds", distribution: 30 },
    { card: "Ace of Diamonds", distribution: 35 },
    // Clubs
    { card: "2 of Clubs", distribution: 25 },
    { card: "3 of Clubs", distribution: 25 },
    { card: "4 of Clubs", distribution: 25 },
    { card: "5 of Clubs", distribution: 25 },
    { card: "6 of Clubs", distribution: 25 },
    { card: "7 of Clubs", distribution: 25 },
    { card: "8 of Clubs", distribution: 25 },
    { card: "9 of Clubs", distribution: 25 },
    { card: "10 of Clubs", distribution: 25 },
    { card: "Jack of Clubs", distribution: 30 },
    { card: "Queen of Clubs", distribution: 40 },
    { card: "King of Clubs", distribution: 30 },
    { card: "Ace of Clubs", distribution: 35 },
    // Spades
    { card: "2 of Spades", distribution: 25 },
    { card: "3 of Spades", distribution: 25 },
    { card: "4 of Spades", distribution: 25 },
    { card: "5 of Spades", distribution: 25 },
    { card: "6 of Spades", distribution: 25 },
    { card: "7 of Spades", distribution: 25 },
    { card: "8 of Spades", distribution: 25 },
    { card: "9 of Spades", distribution: 25 },
    { card: "10 of Spades", distribution: 25 },
    { card: "Jack of Spades", distribution: 30 },
    { card: "Queen of Spades", distribution: 40 },
    { card: "King of Spades", distribution: 30 },
    { card: "Ace of Spades", distribution: 35 },
    // Jokers
    { card: "Joker", distribution: 50 },
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
        setConfigVersion(data.version || 1);
        
        if (data.card_payouts) {
          try {
            // Parse the card distributions from the database
            const distributionsData = typeof data.card_payouts === 'string' 
              ? JSON.parse(data.card_payouts) 
              : data.card_payouts;
            
            const distributionsArray: CardDistribution[] = Object.entries(distributionsData).map(([card, distribution]) => ({
              card,
              distribution: distribution === 'jackpot' ? 'jackpot' : Number(distribution)
            }));
            
            if (distributionsArray.length > 0) {
              setCardDistributions(distributionsArray);
            }
          } catch (parseError) {
            console.error('Error parsing card distributions:', parseError);
            toast({
              title: "Warning",
              description: "Could not parse existing card distributions. Using defaults.",
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
  
  // Handle saving card distributions
  const handleSaveCardDistributions = async () => {
    // Validate card distributions
    const invalidCardDistributions = cardDistributions.filter(
      card => !card.card.trim() || (typeof card.distribution === "number" && (isNaN(card.distribution) || card.distribution < 0))
    );
    
    if (invalidCardDistributions.length > 0) {
      toast({
        title: "Validation Error",
        description: "All cards must have a valid name and non-negative distribution amount.",
        variant: "destructive",
      });
      return;
    }
    
    // Check for duplicate cards
    const cardNames = cardDistributions.map(c => c.card.trim().toLowerCase());
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
      const distributionsObject: Record<string, number | string> = {};
      cardDistributions.forEach(({ card, distribution }) => {
        const trimmedCard = card.trim();
        if (trimmedCard) {
          distributionsObject[trimmedCard] = distribution;
        }
      });
      
      const configData = {
        card_payouts: distributionsObject,
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
      
      // Update version number locally
      if (result.data && result.data.length > 0) {
        setConfigVersion(result.data[0].version || configVersion + 1);
      }
      
      toast({
        title: "Card Distributions Saved",
        description: "Card distribution settings have been updated successfully.",
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
  
  // Handle updating a card distribution
  const updateCardDistribution = (index: number, field: 'card' | 'distribution', value: string | number) => {
    const updatedDistributions = [...cardDistributions];
    if (field === 'card') {
      updatedDistributions[index].card = value as string;
    } else {
      if (value === 'jackpot') {
        updatedDistributions[index].distribution = 'jackpot';
      } else if (value === '' || value === null || value === undefined) {
        updatedDistributions[index].distribution = '';
      } else {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        updatedDistributions[index].distribution = isNaN(numValue) ? '' : numValue;
      }
    }
    setCardDistributions(updatedDistributions);
  };
  
  // Handle removing a card
  const removeCard = (index: number) => {
    const updatedDistributions = cardDistributions.filter((_, i) => i !== index);
    setCardDistributions(updatedDistributions);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Card Distribution Configuration</CardTitle>
        <CardDescription>
          Set distribution amounts for each card in the deck. The Queen of Hearts is always set to "jackpot".
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Changes to card distributions will only affect new games created after saving. 
            Existing games will continue to use their original distribution structure (Configuration Version {configVersion}).
          </AlertDescription>
        </Alert>
        
        {loading ? (
          <div className="min-h-[200px] bg-gradient-to-br from-[#F7F8FC] via-white to-[#F7F8FC]/50 flex flex-col items-center justify-center py-12 space-y-6">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#A1E96C] border-t-[#1F4E4A]"></div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-[#1F4E4A] font-inter">Loading Configuration</h3>
              <p className="text-[#132E2C]/60">Please wait while we load your card distribution settings...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="py-2 text-left">Card</th>
                    <th className="py-2 text-left">Distribution ($)</th>
                    <th className="py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cardDistributions.map((cardDistribution, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 pr-2">
                        <Input
                          value={cardDistribution.card}
                          onChange={(e) => updateCardDistribution(index, 'card', e.target.value)}
                          placeholder="e.g., Ace of Hearts"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        {cardDistribution.card === "Queen of Hearts" ? (
                          <Input
                            value="jackpot"
                            disabled
                            className="bg-muted text-muted-foreground"
                          />
                        ) : (
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={cardDistribution.distribution === '' ? '' : cardDistribution.distribution.toString()}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                updateCardDistribution(index, 'distribution', value === '' ? '' : value);
                              }
                            }}
                            placeholder="25.00"
                          />
                        )}
                      </td>
                      <td className="py-2">
                        {cardDistribution.card !== "Queen of Hearts" && (
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
                  setCardDistributions([...cardDistributions, { card: "", distribution: "" }]);
                }}
              >
                Add Card
              </Button>
              <Button onClick={handleSaveCardDistributions} disabled={loading}>
                {loading ? 'Saving...' : 'Save Card Distributions'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
