
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
import { getTodayDateString } from "@/lib/dateUtils";
import { useAuth } from "@/context/AuthContext";

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
    user_id?: string;
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
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    winnerName: '',
    cardSelected: '',
    slotChosen: '',
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

  // Calculate ending jackpot based on proper carryover logic
  const calculateEndingJackpotForWeek = async (weeklyPayout: number) => {
    try {
      if (!gameId || !weekId) return 0;

      console.log('=== CALCULATING ENDING JACKPOT ===');
      console.log('Game ID:', gameId);
      console.log('Week ID:', weekId);
      console.log('Weekly Payout:', weeklyPayout);

      // Get current week data
      const { data: currentWeek, error: weekError } = await supabase
        .from('weeks')
        .select('week_number')
        .eq('id', weekId)
        .eq('user_id', user?.id)
        .single();

      if (weekError) throw weekError;

      console.log('Current Week Number:', currentWeek.week_number);

      // Get previous week's stored ending jackpot
      let previousEndingJackpot = 0;
      if (currentWeek.week_number > 1) {
        const { data: previousWeek, error: prevWeekError } = await supabase
          .from('weeks')
          .select('ending_jackpot')
          .eq('game_id', gameId)
          .eq('week_number', currentWeek.week_number - 1)
          .eq('user_id', user?.id)
          .single();

        if (prevWeekError || !previousWeek || previousWeek.ending_jackpot === null) {
          console.warn('Could not find previous week, using game carryover');
          previousEndingJackpot = gameData?.carryover_jackpot || 0;
        } else {
          previousEndingJackpot = previousWeek.ending_jackpot;
        }
      } else {
        // Week 1 starts with game's carryover jackpot
        previousEndingJackpot = gameData?.carryover_jackpot || 0;
      }

      console.log('Previous Ending Jackpot:', previousEndingJackpot);

      // Get current week's jackpot contributions
      const { data: weekSales, error: salesError } = await supabase
        .from('ticket_sales')
        .select('jackpot_total')
        .eq('week_id', weekId)
        .eq('user_id', user?.id);

      if (salesError) throw salesError;

      const currentWeekJackpotContributions = weekSales?.reduce((sum, sale) => sum + sale.jackpot_total, 0) || 0;
      console.log('Current Week Jackpot Contributions:', currentWeekJackpotContributions);

      // Calculate ending jackpot: Previous ending jackpot + current week's contributions - payout
      const endingJackpot = previousEndingJackpot + currentWeekJackpotContributions - weeklyPayout;

      console.log('Ending Jackpot Calculation:');
      console.log('Formula: Previous Ending Jackpot + Current Week Contributions - Weekly Payout');
      console.log(`${previousEndingJackpot} + ${currentWeekJackpotContributions} - ${weeklyPayout} = ${endingJackpot}`);
      console.log('=== END CALCULATION ===');

      return Math.max(0, endingJackpot);
    } catch (error) {
      console.error('Error calculating ending jackpot:', error);
      return 0;
    }
  };

  useEffect(() => {
    const loadGameConfiguration = async () => {
      if (!gameId || !open) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Determine which user's config to load - prioritize game's user_id if available
        const targetUserId = gameData?.user_id || user.id;
        console.log('Loading card distributions for user:', targetUserId);

        // Try to get card distributions from user-specific configuration
        const { data: config, error } = await supabase
          .from('configurations')
          .select('*')
          .eq('user_id', targetUserId)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Error fetching configuration:", error);
          toast.error("Failed to load configuration");
          return;
        }

        if (config?.card_payouts) {
          const distributionsData = typeof config.card_payouts === 'string' 
            ? JSON.parse(config.card_payouts) 
            : config.card_payouts;
          
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

          setPenaltyPercentage(config.penalty_percentage || 0);
        } else {
          console.log('No card distributions found in user configuration');
          toast.error("No card distribution configuration found. Please set up your card distributions first.");
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

      if (!formData.slotChosen) {
        toast.error("Please enter a slot number");
        return;
      }

      const slotNumber = parseInt(formData.slotChosen);
      if (isNaN(slotNumber) || slotNumber < 1 || slotNumber > 52) {
        toast.error("Slot number must be between 1 and 52");
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

      console.log('=== WINNER FORM SUBMISSION ===');
      console.log('Final Distribution (Payout):', finalDistribution);

      // Calculate the ending jackpot for this week using the correct formula
      const endingJackpot = await calculateEndingJackpotForWeek(finalDistribution);
      console.log('Calculated Ending Jackpot:', endingJackpot);

      // Update week record with winner details, payout, and ending jackpot
      const { error: weekError } = await supabase
        .from('weeks')
        .update({
          winner_name: formData.winnerName,
          card_selected: formData.cardSelected,
          slot_chosen: slotNumber,
          winner_present: formData.winnerPresent,
          authorized_signature_name: formData.authorizedSignatureName,
          weekly_payout: finalDistribution,
          ending_jackpot: endingJackpot
        })
        .eq('id', weekId);

      if (weekError) throw weekError;

      console.log('Week updated with ending jackpot:', endingJackpot);

      // Update the last ticket sales record with the proper ending jackpot
      const { data: lastSale, error: lastSaleError } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('week_id', weekId)
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (lastSaleError) throw lastSaleError;

      // Update ticket sales record with calculated ending jackpot
      const { error: updateSaleError } = await supabase
        .from('ticket_sales')
        .update({
          weekly_payout_amount: finalDistribution,
          ending_jackpot_total: endingJackpot,
          displayed_jackpot_total: endingJackpot
        })
        .eq('id', lastSale.id);

      if (updateSaleError) throw updateSaleError;

      // Handle carryover for next game if Queen of Hearts was drawn
      if (formData.cardSelected === 'Queen of Hearts') {
        const todayDateString = getTodayDateString();
        console.log('Queen of Hearts drawn - updating game end date and carryover');
        
        // Update game end date and carryover
        const { error: gameUpdateError } = await supabase
          .from('games')
          .update({
            end_date: todayDateString,
            carryover_jackpot: endingJackpot,
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

      // Fetch the week data to get proper dates for the payout slip
      const { data: weekData, error: weekDataError } = await supabase
        .from('weeks')
        .select('*')
        .eq('id', weekId)
        .single();

      if (weekDataError) throw weekDataError;

      // Prepare winner data for distribution slip
      const todayDateString = getTodayDateString();
      const winnerData = {
        winnerName: formData.winnerName,
        cardSelected: formData.cardSelected,
        slotChosen: slotNumber,
        amountWon: finalDistribution,
        authorizedSignatureName: formData.authorizedSignatureName,
        gameId,
        weekId,
        date: todayDateString,
        weekNumber: weekData.week_number,
        weekStartDate: weekData.start_date,
        weekEndDate: weekData.end_date,
        winnerPresent: formData.winnerPresent
      };

      toast.success("Winner details saved successfully!");
      onComplete();
      onOpenPayoutSlip(winnerData);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        winnerName: '',
        cardSelected: '',
        slotChosen: '',
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
                  onChange={(e) => setFormData({ ...formData, slotChosen: e.target.value })}
                  placeholder="Enter slot number (1-52)"
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
