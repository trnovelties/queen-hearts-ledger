import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from 'lucide-react';

interface WinnerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string | null;
  weekId: string | null;
  onComplete: () => void;
  onOpenPayoutSlip: (winnerData: any) => void;
}

export function WinnerForm({
  open, 
  onOpenChange, 
  gameId, 
  weekId,
  onComplete,
  onOpenPayoutSlip
}: WinnerFormProps) {
  const [winnerForm, setWinnerForm] = useState({
    winnerName: "",
    slotChosen: 1,
    cardSelected: "",
    winnerPresent: true
  });
  
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [cardPayouts, setCardPayouts] = useState<Record<string, any>>({});
  const [currentJackpot, setCurrentJackpot] = useState<number>(0);
  const [penaltyConfig, setPenaltyConfig] = useState({
    penaltyPercentage: 10,
    penaltyToOrganization: false
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gameDetails, setGameDetails] = useState<any>(null);
  const [weekDetails, setWeekDetails] = useState<any>(null);
  
  const { toast } = useToast();

  // Get all the card options
  const getCardOptions = () => {
    const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace'];
    const cards = [];
    suits.forEach(suit => {
      values.forEach(value => {
        cards.push(`${value} of ${suit}`);
      });
    });
    cards.push('Joker');
    return cards;
  };

  useEffect(() => {
    if (open && gameId && weekId) {
      // Always fetch fresh data when modal opens
      fetchConfiguration();
      fetchJackpotAmount();
      fetchGameAndWeekDetails();
    }
  }, [open, gameId, weekId]);

  useEffect(() => {
    if (winnerForm.cardSelected) {
      calculatePayout();
    }
  }, [winnerForm.cardSelected, winnerForm.winnerPresent, currentJackpot, cardPayouts]);

  const fetchConfiguration = async () => {
    setLoading(true);
    try {
      // Force fresh fetch by clearing any cache
      const { data, error } = await supabase
        .from('configurations')
        .select('card_payouts, penalty_percentage, penalty_to_organization')
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching configuration:', error);
        throw error;
      }
      
      if (data) {
        console.log('Fresh configuration data:', data);
        
        if (data.card_payouts) {
          const payoutsObj = typeof data.card_payouts === 'string' 
            ? JSON.parse(data.card_payouts) 
            : data.card_payouts;
          
          console.log('Updated card payouts:', payoutsObj);
          setCardPayouts(payoutsObj);
        }
        
        setPenaltyConfig({
          penaltyPercentage: data.penalty_percentage || 10,
          penaltyToOrganization: data.penalty_to_organization || false
        });
        
        console.log('Configuration updated successfully');
      }
    } catch (error) {
      console.error('Error fetching configuration:', error);
      toast({
        title: "Error",
        description: "Failed to load latest configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchJackpotAmount = async () => {
    if (!gameId || !weekId) return;
    
    try {
      // Get the current week's ticket sales to calculate the current jackpot
      const { data: weekSales, error: weekError } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('game_id', gameId)
        .eq('week_id', weekId)
        .order('date', { ascending: true });
      
      if (weekError) throw weekError;
      
      if (weekSales && weekSales.length > 0) {
        // Get the latest entry's ending_jackpot_total
        const latestSale = weekSales[weekSales.length - 1];
        console.log('Latest ticket sale ending jackpot:', latestSale.ending_jackpot_total);
        setCurrentJackpot(Number(latestSale.ending_jackpot_total) || 0);
      } else {
        // If no ticket sales for this week, get the previous week's ending jackpot or game's carryover
        const { data: prevWeekSales, error: prevError } = await supabase
          .from('ticket_sales')
          .select('ending_jackpot_total')
          .eq('game_id', gameId)
          .neq('week_id', weekId)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (prevError) throw prevError;
        
        if (prevWeekSales && prevWeekSales.length > 0) {
          console.log('Previous week ending jackpot:', prevWeekSales[0].ending_jackpot_total);
          setCurrentJackpot(Number(prevWeekSales[0].ending_jackpot_total) || 0);
        } else {
          // Fall back to game's carryover jackpot
          const { data: game, error: gameError } = await supabase
            .from('games')
            .select('carryover_jackpot')
            .eq('id', gameId)
            .maybeSingle();
            
          if (gameError) throw gameError;
          if (game) {
            console.log('Game carryover jackpot:', game.carryover_jackpot);
            setCurrentJackpot(Number(game.carryover_jackpot) || 0);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching jackpot amount:', error);
      setCurrentJackpot(0);
    }
  };

  const fetchGameAndWeekDetails = async () => {
    if (!gameId || !weekId) return;
    
    try {
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .maybeSingle();
      
      if (gameError) throw gameError;
      setGameDetails(game);
      
      const { data: week, error: weekError } = await supabase
        .from('weeks')
        .select('*')
        .eq('id', weekId)
        .maybeSingle();
      
      if (weekError) throw weekError;
      setWeekDetails(week);
    } catch (error) {
      console.error('Error fetching game and week details:', error);
    }
  };

  const calculatePayout = () => {
    let amount = 0;
    
    console.log('Calculating payout for card:', winnerForm.cardSelected);
    console.log('Current jackpot:', currentJackpot);
    console.log('Current card payouts:', cardPayouts);
    
    if (winnerForm.cardSelected === 'Queen of Hearts') {
      amount = Number(currentJackpot) || 0;
      
      // Apply penalty if winner is not present
      if (!winnerForm.winnerPresent) {
        const penaltyAmount = amount * (penaltyConfig.penaltyPercentage / 100);
        amount -= penaltyAmount;
        console.log('Applied penalty:', penaltyAmount, 'New amount:', amount);
      }
    } else if (winnerForm.cardSelected && cardPayouts[winnerForm.cardSelected]) {
      // For other cards, use the fixed payout amount
      const payout = cardPayouts[winnerForm.cardSelected];
      if (typeof payout === 'number') {
        amount = Number(payout);
      } else if (payout === 'jackpot') {
        // Handle case where other cards might also be set to jackpot
        amount = Number(currentJackpot) || 0;
      }
      console.log('Fixed payout for', winnerForm.cardSelected, ':', amount);
    }
    
    console.log('Final calculated payout amount:', amount);
    setPayoutAmount(Number(amount) || 0);
  };

  const submitWinner = async () => {
    if (!gameId || !weekId) return;
    setSubmitting(true);
    
    try {
      // Update the week with winner details
      await supabase.from('weeks').update({
        winner_name: winnerForm.winnerName,
        slot_chosen: winnerForm.slotChosen,
        card_selected: winnerForm.cardSelected,
        winner_present: winnerForm.winnerPresent,
        weekly_payout: payoutAmount
      }).eq('id', weekId);

      // Update the last ticket sale record with the payout
      const newEndingJackpot = Math.max(0, currentJackpot - payoutAmount);
      
      await supabase.from('ticket_sales').update({
        weekly_payout_amount: payoutAmount,
        ending_jackpot_total: newEndingJackpot
      }).eq('week_id', weekId).order('created_at', { ascending: false }).limit(1);

      // Update the game's total payouts
      const currentTotalPayouts = Number(gameDetails?.total_payouts) || 0;
      await supabase.from('games').update({
        total_payouts: currentTotalPayouts + payoutAmount
      }).eq('id', gameId);

      // If Queen of Hearts was drawn, end the game
      if (winnerForm.cardSelected === "Queen of Hearts") {
        await supabase.from('games').update({
          end_date: new Date().toISOString().split('T')[0]
        }).eq('id', gameId);
      }
      
      toast({
        title: "Winner Submitted",
        description: `Winner ${winnerForm.winnerName} has been recorded successfully.`
      });
      
      // Prepare payout slip data
      const payoutSlipData = {
        winnerName: winnerForm.winnerName,
        slotChosen: winnerForm.slotChosen,
        cardSelected: winnerForm.cardSelected,
        payoutAmount: payoutAmount,
        date: new Date().toISOString().split('T')[0],
        gameNumber: gameDetails?.game_number,
        gameName: gameDetails?.name,
        weekNumber: weekDetails?.week_number,
        weekId: weekId,
        weekStartDate: weekDetails?.start_date,
        weekEndDate: weekDetails?.end_date
      };
      
      onOpenChange(false);
      onComplete();
      
      // Reset form
      setWinnerForm({
        winnerName: "",
        slotChosen: 1,
        cardSelected: "",
        winnerPresent: true
      });
      
      // Open payout slip modal
      setTimeout(() => {
        onOpenPayoutSlip(payoutSlipData);
      }, 500);
    } catch (error: any) {
      console.error('Error submitting winner:', error);
      toast({
        title: "Error",
        description: `Failed to submit winner: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Winner Details</DialogTitle>
          <DialogDescription>
            The week is complete. Enter the winner's details for the draw.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="winnerName" className="text-sm font-medium">Winner Name</label>
                <input 
                  id="winnerName" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                  value={winnerForm.winnerName} 
                  onChange={e => setWinnerForm({...winnerForm, winnerName: e.target.value})} 
                  placeholder="John Doe" 
                />
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="slotChosen" className="text-sm font-medium">Slot Chosen (1-54)</label>
                <input 
                  id="slotChosen" 
                  type="number" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                  value={winnerForm.slotChosen} 
                  onChange={e => setWinnerForm({...winnerForm, slotChosen: parseInt(e.target.value) || 1})} 
                  min="1" 
                  max="54" 
                />
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="cardSelected" className="text-sm font-medium">Card Selected</label>
                <select 
                  id="cardSelected" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                  value={winnerForm.cardSelected} 
                  onChange={e => setWinnerForm({...winnerForm, cardSelected: e.target.value})}
                >
                  <option value="">-- Select a Card --</option>
                  {getCardOptions().map(card => <option key={card} value={card}>{card}</option>)}
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <input 
                  id="winnerPresent" 
                  type="checkbox" 
                  className="h-4 w-4 rounded border-gray-300" 
                  checked={winnerForm.winnerPresent} 
                  onChange={e => setWinnerForm({...winnerForm, winnerPresent: e.target.checked})} 
                />
                <label htmlFor="winnerPresent" className="text-sm font-medium">
                  Winner was present
                </label>
              </div>
              
              {winnerForm.cardSelected && (
                <>
                  <Separator />
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Payout Amount</label>
                    <div className="flex items-center h-10 px-3 py-2 border border-input bg-muted/50 rounded-md text-lg font-semibold">
                      ${payoutAmount.toFixed(2)}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Current Jackpot: ${currentJackpot.toFixed(2)}
                    </div>
                    
                    {winnerForm.cardSelected === 'Queen of Hearts' && !winnerForm.winnerPresent && (
                      <p className="text-xs text-muted-foreground">
                        Note: A {penaltyConfig.penaltyPercentage}% penalty has been applied because the winner was not present.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={submitWinner} 
                disabled={!winnerForm.winnerName || !winnerForm.cardSelected || submitting}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Winner
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
