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
import { useGameTotalsUpdater } from "@/hooks/useGameTotalsUpdater";

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
  const { updateGameTotals } = useGameTotalsUpdater();
  const [formData, setFormData] = useState({
    winnerName: '',
    cardSelected: '',
    slotChosen: '' as string | number,
    winnerPresent: true,
    authorizedSignatureName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [cardDistributions, setCardDistributions] = useState<{ card: string; distribution: number }[]>([]);
  const [selectedDistribution, setSelectedDistribution] = useState(0);
  const [penaltyPercentage, setPenaltyPercentage] = useState(0);

  // Calculate total accumulated jackpot for this week
  const totalAccumulatedJackpot = (currentJackpotTotal || 0);
  
  // Use the hook to calculate proper displayed jackpot
  const displayedJackpot = useJackpotCalculation({
    jackpotContributions: jackpotContributions,
    minimumJackpot: gameData?.minimum_starting_jackpot || 500,
    carryoverJackpot: 0 // Don't double-count carryover as it's already in currentJackpotTotal
  });

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

      // For Week 1, the carryover is already included in jackpot_total values, so don't add it again
      // For other weeks, use the previous week's ending jackpot
      let endingJackpot;
      if (currentWeek.week_number === 1) {
        // Week 1: Just use current week contributions - payout (carryover is already in contributions)
        endingJackpot = currentWeekJackpotContributions - weeklyPayout;
      } else {
        // Other weeks: Previous ending + current contributions - payout
        endingJackpot = previousEndingJackpot + currentWeekJackpotContributions - weeklyPayout;
      }

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

  const saveWinnerDetails = async (finalDistribution: number) => {
    try {
      console.log('=== SAVING WINNER DETAILS ===');
      console.log('Final Distribution (Payout):', finalDistribution);

      // Calculate the ending jackpot for this week
      const endingJackpot = await calculateEndingJackpotForWeek(finalDistribution);
      console.log('Calculated Ending Jackpot:', endingJackpot);

      // Update week record with winner details, payout, and ending jackpot
      const { error: weekError } = await supabase
        .from('weeks')
        .update({
          winner_name: formData.winnerName,
          card_selected: formData.cardSelected,
          slot_chosen: Number(formData.slotChosen),
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

      console.log('=== WINNER DETAILS SAVED ===');
      return endingJackpot;
    } catch (error) {
      console.error('Error saving winner details:', error);
      throw error;
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
            // Define the desired card order
            const desiredOrder = [
              "Queen of Hearts", "Joker", "Joker Red",
              "Ace of Hearts", "2 of Hearts", "3 of Hearts", "4 of Hearts", "5 of Hearts", 
              "6 of Hearts", "7 of Hearts", "8 of Hearts", "9 of Hearts", "10 of Hearts", 
              "Jack of Hearts", "King of Hearts",
              "Ace of Spades", "2 of Spades", "3 of Spades", "4 of Spades", "5 of Spades", 
              "6 of Spades", "7 of Spades", "8 of Spades", "9 of Spades", "10 of Spades", 
              "Jack of Spades", "Queen of Spades", "King of Spades",
              "Ace of Diamonds", "2 of Diamonds", "3 of Diamonds", "4 of Diamonds", "5 of Diamonds", 
              "6 of Diamonds", "7 of Diamonds", "8 of Diamonds", "9 of Diamonds", "10 of Diamonds", 
              "Jack of Diamonds", "Queen of Diamonds", "King of Diamonds",
              "Ace of Clubs", "2 of Clubs", "3 of Clubs", "4 of Clubs", "5 of Clubs", 
              "6 of Clubs", "7 of Clubs", "8 of Clubs", "9 of Clubs", "10 of Clubs", 
              "Jack of Clubs", "Queen of Clubs", "King of Clubs"
            ];
            
            // Create ordered array by first adding cards in desired order
            const orderedDistributions: { card: string; distribution: number }[] = [];
            
            // First, add cards in the desired order (excluding Queen of Hearts as it's handled separately)
            desiredOrder.forEach(cardName => {
              if (cardName !== 'Queen of Hearts' && distributionsData[cardName] !== undefined) {
                orderedDistributions.push({
                  card: cardName,
                  distribution: typeof distributionsData[cardName] === 'number' ? distributionsData[cardName] : 0
                });
              }
            });
            
            // Then add any remaining cards that weren't in the desired order
            Object.entries(distributionsData)
              .filter(([card]) => card !== 'Queen of Hearts' && !desiredOrder.includes(card))
              .forEach(([card, distribution]) => {
                orderedDistributions.push({
                  card,
                  distribution: typeof distribution === 'number' ? distribution : 0
                });
              });
            
            setCardDistributions(orderedDistributions);
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
      console.log('🏆 === WINNER FORM HANDLESUBMIT START ===');
      console.log('🏆 Form Data:', formData);
      console.log('🏆 Selected Distribution:', selectedDistribution);
      console.log('🏆 Displayed Jackpot:', displayedJackpot);

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

      console.log('🏆 Card Selected:', formData.cardSelected);

      // Handle Queen of Hearts - set payout amount to total accumulated jackpot
      if (formData.cardSelected === 'Queen of Hearts') {
        console.log('🏆 === QUEEN OF HEARTS FLOW START ===');
        
        // Use the total accumulated jackpot amount (includes previous weeks + current week)
        finalDistribution = totalAccumulatedJackpot > 0 ? totalAccumulatedJackpot : displayedJackpot;
        
        if (finalDistribution <= 0) {
          toast.error("Invalid jackpot amount. Please refresh and try again.");
          return;
        }

        console.log('🏆 ✅ Queen of Hearts selected, using total accumulated jackpot as payout:', finalDistribution);
        console.log('🏆 Total Accumulated Jackpot:', totalAccumulatedJackpot);
        console.log('🏆 Current Jackpot Total:', currentJackpotTotal);
      }

      // Save winner details
      console.log('🏆 Saving winner details...');
      const endingJackpot = await saveWinnerDetails(finalDistribution);
      console.log('🏆 Winner details saved successfully');

      // Update game totals to reflect the new payout
      if (gameId) {
        console.log('🏆 Updating game totals...');
        await updateGameTotals(gameId);
        console.log('🏆 Game totals updated successfully');
      }

      // Fetch the week data to get proper dates for the payout slip
      const { data: weekData, error: weekDataError } = await supabase
        .from('weeks')
        .select('*')
        .eq('id', weekId)
        .single();

      if (weekDataError) throw weekDataError;

      const todayDateString = getTodayDateString();
      const winnerData = {
        winnerName: formData.winnerName,
        cardSelected: formData.cardSelected,
        slotChosen: Number(formData.slotChosen),
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

      if (formData.cardSelected === 'Queen of Hearts') {
        toast.success("Winner details saved! Click 'Complete Your Game' to finish the game and distribute the jackpot.");
      } else {
        toast.success("Winner details saved successfully!");
        onOpenPayoutSlip(winnerData);
      }

      onComplete();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        winnerName: '',
        cardSelected: '',
        slotChosen: '' as string | number,
        winnerPresent: true,
        authorizedSignatureName: ''
      });
      setSelectedDistribution(0);
      
      console.log('🏆 === WINNER FORM HANDLESUBMIT END ===');
    } catch (error) {
      console.error('🏆 ❌ Error in winner form handleSubmit:', error);
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
            <CardDescription>
              Enter the winner's information for this week
            </CardDescription>
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
                <Select 
                  onValueChange={(value) => {
                    setFormData({ ...formData, cardSelected: value });
                    const distribution = cardDistributions.find(card => card.card === value)?.distribution || 0;
                    setSelectedDistribution(distribution);
                  }}
                >
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
                  value={formData.slotChosen}
                  onChange={(e) => setFormData({ ...formData, slotChosen: e.target.value })}
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
                <Button 
                  type="submit" 
                  disabled={isLoading} 
                  className="flex-1"
                >
                  {isLoading ? "Saving..." : "Save Winner Details"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
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
