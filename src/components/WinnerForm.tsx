
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

interface WinnerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  weekId: string;
  gameData?: {
    ticket_price: number;
    organization_percentage: number;
    jackpot_percentage: number;
    minimum_starting_jackpot: number;
    carryover_jackpot: number;
    total_payouts: number;
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
  const [cardPayouts, setCardPayouts] = useState<{ card: string; payout: number }[]>([]);
  const [selectedPayout, setSelectedPayout] = useState(0);
  const [penaltyPercentage, setPenaltyPercentage] = useState(0);

  // Use the hook to calculate proper displayed jackpot
  const displayedJackpot = useJackpotCalculation({
    jackpotContributions: jackpotContributions,
    minimumJackpot: gameData?.minimum_starting_jackpot || 500,
    carryoverJackpot: gameData?.carryover_jackpot || 0
  });

  useEffect(() => {
    const fetchConfiguration = async () => {
      const { data: config, error } = await supabase
        .from('configurations')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching configuration:", error);
        toast.error("Failed to load configuration");
        return;
      }

      if (config) {
        // Parse card payouts
        if (config.card_payouts) {
          try {
            const payouts = typeof config.card_payouts === 'string' ? JSON.parse(config.card_payouts) : config.card_payouts;
            if (Array.isArray(payouts)) {
              setCardPayouts(payouts.map(payout => ({
                card: payout.card || '',
                payout: payout.payout || 0
              })));
            } else {
              console.warn("Unexpected format for card_payouts:", payouts);
            }
          } catch (parseError) {
            console.error("Error parsing card_payouts:", parseError);
          }
        }

        // Set penalty percentage
        setPenaltyPercentage(config.penalty_percentage || 0);
      }
    };

    fetchConfiguration();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.winnerName || !formData.cardSelected || !formData.authorizedSignatureName) {
        toast.error("Please fill out all fields");
        return;
      }

      if (!selectedPayout && formData.cardSelected !== 'Queen of Hearts') {
        toast.error("Please select a valid payout");
        return;
      }

      let finalPayout = selectedPayout;

      // Handle Queen of Hearts special case
      if (formData.cardSelected === 'Queen of Hearts') {
        finalPayout = displayedJackpot; // Use displayed jackpot instead of currentJackpotTotal
        
        // Apply penalty if winner not present
        if (!formData.winnerPresent) {
          const penalty = finalPayout * (penaltyPercentage / 100);
          finalPayout = finalPayout - penalty;
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
          weekly_payout: finalPayout
        })
        .eq('id', weekId);

      if (weekError) throw weekError;

      // Update the last ticket sales record with the payout
      const { data: lastSale, error: lastSaleError } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('week_id', weekId)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (lastSaleError) throw lastSaleError;

      // Calculate new ending jackpot total
      let newEndingJackpot = displayedJackpot - finalPayout;

      // Handle carryover for next game if Queen of Hearts was drawn
      let carryoverAmount = 0;
      if (formData.cardSelected === 'Queen of Hearts') {
        carryoverAmount = newEndingJackpot;
        newEndingJackpot = 0;
        
        // Update game end date and carryover
        const { error: gameUpdateError } = await supabase
          .from('games')
          .update({
            end_date: new Date().toISOString().split('T')[0],
            carryover_jackpot: carryoverAmount,
            total_payouts: (gameData?.total_payouts || 0) + finalPayout
          })
          .eq('id', gameId);

        if (gameUpdateError) throw gameUpdateError;
      } else {
        // Update game totals
        const { error: gameUpdateError } = await supabase
          .from('games')
          .update({
            total_payouts: (gameData?.total_payouts || 0) + finalPayout
          })
          .eq('id', gameId);

        if (gameUpdateError) throw gameUpdateError;
      }

      // Update ticket sales record with new ending jackpot
      const { error: updateSaleError } = await supabase
        .from('ticket_sales')
        .update({
          weekly_payout_amount: finalPayout,
          ending_jackpot_total: newEndingJackpot,
          displayed_jackpot_total: newEndingJackpot
        })
        .eq('id', lastSale.id);

      if (updateSaleError) throw updateSaleError;

      // Prepare winner data for payout slip
      const winnerData = {
        winnerName: formData.winnerName,
        cardSelected: formData.cardSelected,
        slotChosen: formData.slotChosen,
        amountWon: finalPayout,
        authorizedSignatureName: formData.authorizedSignatureName,
        gameId,
        weekId
      };

      toast.success("Winner details saved successfully!");
      onComplete();
      onOpenPayoutSlip(winnerData);
      onOpenChange(false);
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
                  const payout = cardPayouts.find(card => card.card === value)?.payout || 0;
                  setSelectedPayout(payout);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a card" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Queen of Hearts">Queen of Hearts</SelectItem>
                    {cardPayouts.map((card, index) => (
                      <SelectItem key={index} value={card.card}>{card.card} - ${card.payout}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.cardSelected !== 'Queen of Hearts' && (
                <div className="space-y-2">
                  <Label htmlFor="selectedPayout">Selected Payout</Label>
                  <Input
                    id="selectedPayout"
                    type="number"
                    value={selectedPayout}
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
