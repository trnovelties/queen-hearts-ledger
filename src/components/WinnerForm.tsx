
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useJackpotCalculation } from "@/hooks/useJackpotCalculation";
import { formatDateForDatabase } from "@/lib/dateUtils";

interface WinnerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string | null;
  weekId: string | null;
  gameData?: {
    ticket_price: number;
    organization_percentage: number;
    jackpot_percentage: number;
    minimum_starting_jackpot: number;
    carryover_jackpot: number;
    total_payouts: number;
    card_payouts?: any;
  };
  currentJackpotTotal?: number;
  jackpotContributions?: number;
  onComplete: () => void;
  onOpenPayoutSlip: (winnerData: any) => void;
}

export function WinnerForm({ 
  open,
  onOpenChange,
  gameId, 
  weekId, 
  gameData, 
  currentJackpotTotal = 0, 
  jackpotContributions = 0,
  onComplete, 
  onOpenPayoutSlip 
}: WinnerFormProps) {
  const [formData, setFormData] = useState({
    winnerName: '',
    cardSelected: '',
    slotChosen: 1,
    winnerPresent: true,
    authorizedSignatureName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [cardDistributions, setCardDistributions] = useState<{ card: string; distribution: number }[]>([]);
  const [selectedDistribution, setSelectedDistribution] = useState(0);
  const [penaltyPercentage, setPenaltyPercentage] = useState(0);

  // Use the hook to calculate proper displayed jackpot
  const displayedJackpot = useJackpotCalculation({
    jackpotContributions: jackpotContributions,
    minimumJackpot: gameData?.minimum_starting_jackpot || 500,
    carryoverJackpot: gameData?.carryover_jackpot || 0
  });

  useEffect(() => {
    const loadGameConfiguration = async () => {
      if (!gameId || !open) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // First try to get card distributions from the game data (game-specific)
        if (gameData?.card_payouts) {
          const distributionsData = gameData.card_payouts;
          
          if (Array.isArray(distributionsData)) {
            setCardDistributions(distributionsData.map(distribution => ({
              card: distribution.card || '',
              distribution: distribution.payout || 0
            })));
          } else if (typeof distributionsData === 'object') {
            // Convert object format to array
            const distributionsArray = Object.entries(distributionsData)
              .filter(([card, distribution]) => card !== 'Queen of Hearts')
              .map(([card, distribution]) => ({
                card,
                distribution: typeof distribution === 'number' ? distribution : 0
              }));
            setCardDistributions(distributionsArray);
          }
        } else {
          // Fallback to current user-specific configuration if game doesn't have card distributions
          const { data: config, error } = await supabase
            .from('configurations')
            .select('*')
            .eq('user_id', user.id)
            .limit(1)
            .single();

          if (error) {
            console.error("Error fetching configuration:", error);
            toast.error("Failed to load configuration");
            return;
          }

          if (config?.card_payouts) {
            const distributionsData = typeof config.card_payouts === 'string' ? JSON.parse(config.card_payouts) : config.card_payouts;
            
            if (Array.isArray(distributionsData)) {
              setCardDistributions(distributionsData.map(distribution => ({
                card: distribution.card || '',
                distribution: distribution.payout || 0
              })));
            } else {
              const distributionsArray = Object.entries(distributionsData)
                .filter(([card, distribution]) => card !== 'Queen of Hearts')
                .map(([card, distribution]) => ({
                  card,
                  distribution: typeof distribution === 'number' ? distribution : 0
                }));
              setCardDistributions(distributionsArray);
            }
          }

          setPenaltyPercentage(config?.penalty_percentage || 0);
        }

        // Get penalty percentage from current user-specific configuration
        const { data: config, error: configError } = await supabase
          .from('configurations')
          .select('penalty_percentage')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (!configError && config) {
          setPenaltyPercentage(config.penalty_percentage || 0);
        }
      } catch (error) {
        console.error("Error loading game configuration:", error);
        toast.error("Failed to load game configuration");
      }
    };

    loadGameConfiguration();
  }, [open, gameData, gameId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!gameId || !weekId) {
        toast.error("Missing game or week information");
        return;
      }

      if (!formData.winnerName || !formData.cardSelected || !formData.authorizedSignatureName) {
        toast.error("Please fill out all fields");
        return;
      }

      if (!selectedDistribution && formData.cardSelected !== 'Queen of Hearts') {
        toast.error("Please select a valid distribution");
        return;
      }

      let finalDistribution = selectedDistribution;

      // Handle Queen of Hearts special case
      if (formData.cardSelected === 'Queen of Hearts') {
        finalDistribution = displayedJackpot;
        
        // Apply penalty if winner not present
        if (!formData.winnerPresent) {
          const penalty = finalDistribution * (penaltyPercentage / 100);
          finalDistribution = finalDistribution - penalty;
        }
      }

      // Update week record
      const { error: weekError } = await supabase
        .from('weeks')
        .update({
          winner_name: formData.winnerName,
          card_selected: formData.cardSelected,
          slot_chosen: formData.slotChosen,
          winner_present: formData.winnerPresent,
          authorized_signature_name: formData.authorizedSignatureName,
          weekly_payout: finalDistribution
        })
        .eq('id', weekId);

      if (weekError) throw weekError;

      // Update the last ticket sales record with the distribution
      const { data: lastSale, error: lastSaleError } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('week_id', weekId)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (lastSaleError) throw lastSaleError;

      // Calculate new ending jackpot total
      let newEndingJackpot = displayedJackpot - finalDistribution;

      // Handle carryover for next game if Queen of Hearts was drawn
      let carryoverAmount = 0;
      if (formData.cardSelected === 'Queen of Hearts') {
        carryoverAmount = newEndingJackpot;
        newEndingJackpot = 0;
        
        // Update game end date and carryover
        const { error: gameUpdateError } = await supabase
          .from('games')
          .update({
            end_date: formatDateForDatabase(new Date()),
            carryover_jackpot: carryoverAmount,
            total_payouts: (gameData?.total_payouts || 0) + finalDistribution
          })
          .eq('id', gameId);

        if (gameUpdateError) throw gameUpdateError;
      } else {
        // Update game totals
        const { error: gameUpdateError } = await supabase
          .from('games')
          .update({
            total_payouts: (gameData?.total_payouts || 0) + finalDistribution
          })
          .eq('id', gameId);

        if (gameUpdateError) throw gameUpdateError;
      }

      // Update ticket sales record with new ending jackpot
      const { error: updateSaleError } = await supabase
        .from('ticket_sales')
        .update({
          weekly_payout_amount: finalDistribution,
          ending_jackpot_total: newEndingJackpot,
          displayed_jackpot_total: newEndingJackpot
        })
        .eq('id', lastSale.id);

      if (updateSaleError) throw updateSaleError;

      // Prepare winner data for distribution slip
      const winnerData = {
        winnerName: formData.winnerName,
        cardSelected: formData.cardSelected,
        slotChosen: formData.slotChosen,
        amountWon: finalDistribution,
        authorizedSignatureName: formData.authorizedSignatureName,
        gameId,
        weekId,
        date: formatDateForDatabase(new Date())
      };

      toast.success("Winner details saved successfully!");
      onComplete();
      onOpenPayoutSlip(winnerData);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        winnerName: '',
        cardSelected: '',
        slotChosen: 1,
        winnerPresent: true,
        authorizedSignatureName: ''
      });
      setSelectedDistribution(0);
    } catch (error) {
      console.error('Error saving winner details:', error);
      toast.error("Failed to save winner details");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>Record Winner Details</CardTitle>
            <CardDescription>Enter the winner's information for this week</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="winnerName">Winner's Name</Label>
                <Input
                  id="winnerName"
                  type="text"
                  value={formData.winnerName}
                  onChange={(e) => setFormData({ ...formData, winnerName: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardSelected">Card Selected</Label>
                <Select onValueChange={(value) => {
                  setFormData({ ...formData, cardSelected: value });
                  const distribution = cardDistributions.find(card => card.card === value)?.distribution || 0;
                  setSelectedDistribution(distribution);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a card" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Queen of Hearts">Queen of Hearts</SelectItem>
                    {cardDistributions.map((card, index) => (
                      <SelectItem key={index} value={card.card}>{card.card} - ${card.distribution}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.cardSelected !== 'Queen of Hearts' && (
                <div className="space-y-2">
                  <Label htmlFor="selectedDistribution">Selected Distribution</Label>
                  <Input
                    id="selectedDistribution"
                    type="number"
                    value={selectedDistribution}
                    readOnly
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="slotChosen">Slot Chosen</Label>
                <Input
                  id="slotChosen"
                  type="number"
                  min="1"
                  max="52"
                  value={formData.slotChosen}
                  onChange={(e) => setFormData({ ...formData, slotChosen: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="winnerPresent"
                  checked={formData.winnerPresent}
                  onCheckedChange={(checked) => setFormData({ ...formData, winnerPresent: checked === true })}
                />
                <Label htmlFor="winnerPresent">Winner Present</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="authorizedSignatureName">Authorized Signature Name</Label>
                <Input
                  id="authorizedSignatureName"
                  type="text"
                  value={formData.authorizedSignatureName}
                  onChange={(e) => setFormData({ ...formData, authorizedSignatureName: e.target.value })}
                  placeholder="Jane Smith"
                  required
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Saving..." : "Save Winner Details"}
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
