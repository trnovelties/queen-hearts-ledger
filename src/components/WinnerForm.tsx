
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface WinnerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string | null;
  weekId: string | null;
  onComplete: () => void;
  onOpenPayoutSlip: (winnerData: any) => void;
}

export function WinnerForm({ open, onOpenChange, gameId, weekId, onComplete, onOpenPayoutSlip }: WinnerFormProps) {
  const [winnerForm, setWinnerForm] = useState({
    winnerName: '',
    slotChosen: 1,
    cardSelected: '',
    winnerPresent: true,
    payoutAmount: 0
  });
  const [cardPayouts, setCardPayouts] = useState<any>({});
  const [currentJackpot, setCurrentJackpot] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Card options for the dropdown
  const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace'];
  
  const cardOptions = [
    ...suits.flatMap(suit => 
      values.map(value => `${value} of ${suit}`)
    ),
    'Joker'
  ];

  useEffect(() => {
    if (open && gameId && weekId) {
      fetchCurrentJackpot();
      fetchAndApplyLatestConfiguration();
    }
  }, [open, gameId, weekId]);

  const fetchAndApplyLatestConfiguration = async () => {
    try {
      const { data: config, error } = await supabase
        .from('configurations')
        .select('card_payouts')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (config && config.length > 0 && config[0].card_payouts) {
        console.log('Fetched configuration:', config[0].card_payouts);
        setCardPayouts(config[0].card_payouts);
        
        // If a card is already selected, update the payout amount immediately
        if (winnerForm.cardSelected && config[0].card_payouts[winnerForm.cardSelected]) {
          const payoutValue = config[0].card_payouts[winnerForm.cardSelected];
          if (payoutValue === 'jackpot') {
            setWinnerForm(prev => ({ ...prev, payoutAmount: currentJackpot }));
          } else {
            setWinnerForm(prev => ({ ...prev, payoutAmount: payoutValue }));
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching configuration:', error);
    }
  };

  const fetchCurrentJackpot = async () => {
    if (!gameId || !weekId) return;

    try {
      // Get the latest ticket sale entry for this week to get the current jackpot
      const { data: salesData, error: salesError } = await supabase
        .from('ticket_sales')
        .select('ending_jackpot_total')
        .eq('week_id', weekId)
        .order('date', { ascending: false })
        .limit(1);

      if (salesError) throw salesError;

      if (salesData && salesData.length > 0) {
        setCurrentJackpot(salesData[0].ending_jackpot_total);
      }
    } catch (error: any) {
      console.error('Error fetching current jackpot:', error);
    }
  };

  const handleCardSelectionChange = (selectedCard: string) => {
    setWinnerForm(prev => ({ ...prev, cardSelected: selectedCard }));

    // Auto-populate payout amount based on selected card
    if (cardPayouts[selectedCard]) {
      const payoutValue = cardPayouts[selectedCard];
      if (payoutValue === 'jackpot') {
        setWinnerForm(prev => ({ ...prev, payoutAmount: currentJackpot }));
      } else {
        setWinnerForm(prev => ({ ...prev, payoutAmount: payoutValue }));
      }
    }
  };

  const submitWinner = async () => {
    if (!gameId || !weekId) return;

    try {
      setLoading(true);

      // Get game and week data
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;

      const { data: weekData, error: weekError } = await supabase
        .from('weeks')
        .select('*')
        .eq('id', weekId)
        .single();

      if (weekError) throw weekError;

      let finalPayoutAmount = winnerForm.payoutAmount;

      // Apply penalty if winner is not present
      if (!winnerForm.winnerPresent) {
        const { data: config } = await supabase
          .from('configurations')
          .select('penalty_percentage')
          .order('updated_at', { ascending: false })
          .limit(1);

        const penaltyPercentage = config?.[0]?.penalty_percentage || 10;
        const penaltyAmount = (finalPayoutAmount * penaltyPercentage) / 100;
        finalPayoutAmount = finalPayoutAmount - penaltyAmount;

        toast({
          title: "Penalty Applied",
          description: `${penaltyPercentage}% penalty applied for winner absence. Payout reduced by ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(penaltyAmount)}.`,
        });
      }

      // Update the week with winner details
      await supabase.from('weeks').update({
        winner_name: winnerForm.winnerName,
        slot_chosen: winnerForm.slotChosen,
        card_selected: winnerForm.cardSelected,
        winner_present: winnerForm.winnerPresent,
        weekly_payout: finalPayoutAmount
      }).eq('id', weekId);

      // Update game's total payouts
      await supabase.from('games').update({
        total_payouts: gameData.total_payouts + finalPayoutAmount
      }).eq('id', gameId);

      // If Queen of Hearts was drawn, end the game and create carryover
      if (winnerForm.cardSelected === 'Queen of Hearts') {
        // Set the game end date to the week's end date (not current date)
        await supabase.from('games').update({
          end_date: weekData.end_date  // Use the week's end_date instead of current date
        }).eq('id', gameId);

        // Calculate carryover for next game (remaining jackpot after payout)
        const carryoverAmount = currentJackpot - finalPayoutAmount;

        toast({
          title: "Game Completed!",
          description: `${winnerForm.winnerName} won the Queen of Hearts! Game ended on ${format(new Date(weekData.end_date), 'MMM d, yyyy')}. Carryover: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(carryoverAmount)}`,
        });
      }

      // Prepare data for payout slip
      const winnerData = {
        winnerName: winnerForm.winnerName,
        slotChosen: winnerForm.slotChosen,
        cardSelected: winnerForm.cardSelected,
        payoutAmount: finalPayoutAmount,
        date: new Date().toISOString().split('T')[0],
        gameNumber: gameData.game_number,
        gameName: gameData.name,
        weekNumber: weekData.week_number,
        weekStartDate: weekData.start_date,
        weekEndDate: weekData.end_date
      };

      toast({
        title: "Winner Details Saved",
        description: `${winnerForm.winnerName} has been recorded as the winner.`
      });

      // Reset form
      setWinnerForm({
        winnerName: '',
        slotChosen: 1,
        cardSelected: '',
        winnerPresent: true,
        payoutAmount: 0
      });

      onComplete();
      onOpenChange(false);

      // Open payout slip
      onOpenPayoutSlip(winnerData);

    } catch (error: any) {
      console.error('Error submitting winner:', error);
      toast({
        title: "Error",
        description: `Failed to save winner details: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Winner Details</DialogTitle>
          <DialogDescription>
            Enter the details for this week's winner. Payout amount will be auto-calculated based on the selected card.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="winnerName">Winner Name</Label>
            <Input
              id="winnerName"
              value={winnerForm.winnerName}
              onChange={e => setWinnerForm({ ...winnerForm, winnerName: e.target.value })}
              placeholder="Enter winner's name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="slotChosen">Slot Chosen (1-54)</Label>
            <Input
              id="slotChosen"
              type="number"
              min="1"
              max="54"
              value={winnerForm.slotChosen}
              onChange={e => setWinnerForm({ ...winnerForm, slotChosen: parseInt(e.target.value) })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cardSelected">Card Selected</Label>
            <Select onValueChange={handleCardSelectionChange} value={winnerForm.cardSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Select the card revealed" />
              </SelectTrigger>
              <SelectContent>
                {cardOptions.map(card => (
                  <SelectItem key={card} value={card}>
                    {card}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="payoutAmount">Payout Amount</Label>
            <Input
              id="payoutAmount"
              type="number"
              step="0.01"
              min="0"
              value={winnerForm.payoutAmount}
              onChange={e => setWinnerForm({ ...winnerForm, payoutAmount: parseFloat(e.target.value) || 0 })}
              placeholder="Auto-populated based on card"
            />
            <p className="text-xs text-muted-foreground">
              {winnerForm.cardSelected === 'Queen of Hearts' 
                ? `Full jackpot: ${formatCurrency(currentJackpot)}`
                : winnerForm.cardSelected && cardPayouts[winnerForm.cardSelected]
                ? `Default payout: ${formatCurrency(cardPayouts[winnerForm.cardSelected])}`
                : 'Select a card to see payout amount'
              }
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="winnerPresent"
              checked={winnerForm.winnerPresent}
              onCheckedChange={(checked) => setWinnerForm({ ...winnerForm, winnerPresent: checked as boolean })}
            />
            <Label htmlFor="winnerPresent">Winner was present</Label>
          </div>
          {!winnerForm.winnerPresent && (
            <p className="text-xs text-yellow-600">
              A 10% penalty will be applied to the payout for winner absence.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="secondary">
            Cancel
          </Button>
          <Button 
            onClick={submitWinner} 
            disabled={!winnerForm.winnerName || !winnerForm.cardSelected || loading}
          >
            {loading ? 'Saving...' : 'Save Winner'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
