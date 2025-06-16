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

  // Force fetch the absolute latest configuration data
  const fetchLatestConfiguration = async () => {
    try {
      console.log('🔄 Fetching ABSOLUTE LATEST configuration data...');
      
      // Clear any potential caching by using a random parameter
      const randomParam = Math.random();
      
      const { data, error } = await supabase
        .from('configurations')
        .select('card_payouts, penalty_percentage, penalty_to_organization, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('❌ Error fetching latest configuration:', error);
        throw error;
      }
      
      if (data) {
        console.log('✅ ABSOLUTE LATEST configuration data received:', data);
        console.log('📅 Configuration updated_at:', data.updated_at);
        
        if (data.card_payouts) {
          const payoutsObj = typeof data.card_payouts === 'string' 
            ? JSON.parse(data.card_payouts) 
            : data.card_payouts;
          
          console.log('💰 Setting ABSOLUTE LATEST card payouts:', payoutsObj);
          console.log('🎯 Specific card values:');
          console.log('  - 8 of Hearts:', payoutsObj['8 of Hearts']);
          console.log('  - 8 of Clubs:', payoutsObj['8 of Clubs']);
          console.log('  - 8 of Diamonds:', payoutsObj['8 of Diamonds']);
          console.log('  - 8 of Spades:', payoutsObj['8 of Spades']);
          
          setCardPayouts(payoutsObj);
          return payoutsObj;
        }
        
        setPenaltyConfig({
          penaltyPercentage: data.penalty_percentage || 10,
          penaltyToOrganization: data.penalty_to_organization || false
        });
        
        return data;
      }
    } catch (error) {
      console.error('💥 Error fetching latest configuration:', error);
      toast({
        title: "Error",
        description: "Failed to load latest configuration. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Calculate payout with the latest data
  const calculatePayoutWithLatestData = (selectedCard: string, isPresent: boolean, jackpot: number, payouts: Record<string, any>) => {
    let amount = 0;
    
    console.log('🧮 === CALCULATING PAYOUT WITH LATEST DATA ===');
    console.log('🎴 Selected card:', selectedCard);
    console.log('💎 Current jackpot:', jackpot);
    console.log('📋 All available payouts:', Object.keys(payouts));
    console.log('✅ Winner present:', isPresent);
    
    if (selectedCard === 'Queen of Hearts') {
      amount = Number(jackpot) || 0;
      
      // Apply penalty if winner is not present
      if (!isPresent) {
        const penaltyAmount = amount * (penaltyConfig.penaltyPercentage / 100);
        amount -= penaltyAmount;
        console.log('⚠️ Applied penalty:', penaltyAmount, 'New amount:', amount);
      }
    } else if (selectedCard && payouts[selectedCard] !== undefined) {
      // For other cards, use the fixed payout amount
      const payout = payouts[selectedCard];
      console.log('🎯 Found payout for', selectedCard, ':', payout);
      
      if (typeof payout === 'number') {
        amount = Number(payout);
      } else if (payout === 'jackpot') {
        // Handle case where other cards might also be set to jackpot
        amount = Number(jackpot) || 0;
      }
      console.log('💵 Final payout for', selectedCard, ':', amount);
    } else {
      console.log('❌ No payout found for card:', selectedCard);
      console.log('📋 Available cards in payouts:', Object.keys(payouts));
      console.log('🔍 Exact match check:', payouts[selectedCard]);
    }
    
    console.log('🏆 === FINAL CALCULATED AMOUNT ===:', amount);
    return Number(amount) || 0;
  };

  // Fetch jackpot amount
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
        return Number(latestSale.ending_jackpot_total) || 0;
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
          const jackpot = Number(prevWeekSales[0].ending_jackpot_total) || 0;
          setCurrentJackpot(jackpot);
          return jackpot;
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
            const jackpot = Number(game.carryover_jackpot) || 0;
            setCurrentJackpot(jackpot);
            return jackpot;
          }
        }
      }
      return 0;
    } catch (error) {
      console.error('Error fetching jackpot amount:', error);
      setCurrentJackpot(0);
      return 0;
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

  // Initialize data when modal opens
  useEffect(() => {
    if (open && gameId && weekId) {
      const initializeData = async () => {
        setLoading(true);
        try {
          // Always fetch the absolute latest configuration
          await fetchLatestConfiguration();
          await fetchJackpotAmount();
          await fetchGameAndWeekDetails();
          
          console.log('✅ All data initialized with latest configuration');
        } catch (error) {
          console.error('💥 Error initializing data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      initializeData();
    }
  }, [open, gameId, weekId]);

  // Recalculate payout when card selection or presence changes
  useEffect(() => {
    if (winnerForm.cardSelected && Object.keys(cardPayouts).length > 0 && currentJackpot >= 0) {
      console.log('🔄 Recalculating payout due to selection change...');
      const amount = calculatePayoutWithLatestData(
        winnerForm.cardSelected, 
        winnerForm.winnerPresent, 
        currentJackpot, 
        cardPayouts
      );
      setPayoutAmount(amount);
    }
  }, [winnerForm.cardSelected, winnerForm.winnerPresent, currentJackpot, cardPayouts]);

  // Handle card selection change - always fetch latest config
  const handleCardSelection = async (selectedCard: string) => {
    console.log('🎴 Card selected:', selectedCard, '- fetching ABSOLUTE LATEST configuration...');
    setWinnerForm({...winnerForm, cardSelected: selectedCard});
    
    if (selectedCard) {
      // Always fetch the absolute latest configuration for this specific card selection
      const latestPayouts = await fetchLatestConfiguration();
      const latestJackpot = await fetchJackpotAmount();
      
      if (latestPayouts?.card_payouts) {
        const payoutsToUse = typeof latestPayouts.card_payouts === 'string' 
          ? JSON.parse(latestPayouts.card_payouts) 
          : latestPayouts.card_payouts;
          
        console.log('🎯 Using ABSOLUTE LATEST payouts for calculation:', payoutsToUse);
        console.log('🔍 Looking for card:', selectedCard);
        console.log('💰 Found value:', payoutsToUse[selectedCard]);
        
        const amount = calculatePayoutWithLatestData(
          selectedCard, 
          winnerForm.winnerPresent, 
          latestJackpot, 
          payoutsToUse
        );
        setPayoutAmount(amount);
      }
    }
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
                  onChange={e => handleCardSelection(e.target.value)}
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
                    
                    <div className="text-xs text-muted-foreground">
                      Card: {winnerForm.cardSelected} | 
                      Configured Payout: {cardPayouts[winnerForm.cardSelected] === 'jackpot' ? 'Full Jackpot' : `$${cardPayouts[winnerForm.cardSelected]}`}
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
