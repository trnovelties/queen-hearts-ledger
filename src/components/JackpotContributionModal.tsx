
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getTodayDateString } from "@/lib/dateUtils";

interface JackpotContributionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string | null;
  totalJackpot: number;
  winnerName: string;
  onComplete: () => void;
}

export const JackpotContributionModal = ({
  open,
  onOpenChange,
  gameId,
  totalJackpot,
  winnerName,
  onComplete
}: JackpotContributionModalProps) => {
  const [contribution, setContribution] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const winnerReceives = totalJackpot - contribution;
  const nextGameGets = contribution;

  const handleSubmit = async () => {
    if (!gameId || !user?.id) return;

    // Validation
    if (contribution < 0) {
      toast({
        title: "Invalid Amount",
        description: "Contribution cannot be negative.",
        variant: "destructive",
      });
      return;
    }

    if (contribution > totalJackpot) {
      toast({
        title: "Invalid Amount",
        description: "Contribution cannot exceed the total jackpot.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('=== PHASE 3: JACKPOT CONTRIBUTION MODAL ===');
      console.log('Game ID:', gameId);
      console.log('Total Jackpot:', totalJackpot);
      console.log('Contribution to Next Game:', contribution);
      console.log('Winner Receives:', winnerReceives);

      // PHASE 3: Complete the current game
      const todayDateString = getTodayDateString();
      
      // Update current game: end it and set jackpot contribution
      const { error: gameError } = await supabase
        .from('games')
        .update({
          end_date: todayDateString,
          jackpot_contribution_to_next_game: contribution,
          total_payouts: totalJackpot - contribution // Update total payouts with what winner actually receives
        })
        .eq('id', gameId)
        .eq('user_id', user.id);

      if (gameError) throw gameError;

      console.log('Current game ended with contribution:', contribution);

      // Check if there's already a next game created
      const { data: nextGame, error: nextGameError } = await supabase
        .from('games')
        .select('id, carryover_jackpot, name')
        .eq('user_id', user.id)
        .is('end_date', null)
        .neq('id', gameId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(); // Use maybeSingle to avoid errors if no next game exists

      if (nextGameError) {
        console.error('Error checking for next game:', nextGameError);
        // Continue anyway - this is not critical
      }

      if (nextGame) {
        // Update existing next game with additional carryover
        console.log('Updating existing next game:', nextGame.name, 'with additional carryover:', contribution);
        
        const { error: updateError } = await supabase
          .from('games')
          .update({
            carryover_jackpot: (nextGame.carryover_jackpot || 0) + contribution
          })
          .eq('id', nextGame.id)
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Error updating next game carryover:', updateError);
          // This is not critical, continue
        } else {
          console.log('Next game carryover updated successfully');
        }
      } else {
        console.log('No existing next game found - carryover will be handled when new game is created');
      }

      console.log('=== PHASE 3: COMPLETION SUCCESSFUL ===');

      toast({
        title: "Game Completed",
        description: `${winnerName} receives ${formatCurrency(winnerReceives)}. ${formatCurrency(nextGameGets)} contributed to next game. Game has been ended.`,
      });

      onComplete();
      onOpenChange(false);
      
      // Reset form
      setContribution(0);

    } catch (error: any) {
      console.error('Error completing Queen of Hearts game:', error);
      toast({
        title: "Error",
        description: `Failed to complete game: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContributionChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setContribution(numValue);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Queen of Hearts Won!</DialogTitle>
          <DialogDescription>
            {winnerName} has won the Queen of Hearts! Choose how much of the {formatCurrency(totalJackpot)} jackpot to contribute to the next game. This will end the current game.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="contribution">Contribution to Next Game</Label>
            <Input
              id="contribution"
              type="number"
              step="0.01"
              min="0"
              max={totalJackpot}
              value={contribution || ''}
              onChange={(e) => handleContributionChange(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Maximum: {formatCurrency(totalJackpot)}
            </p>
          </div>
          
          {/* Summary Display */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <h4 className="font-medium mb-2">Summary</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Winner receives:</span>
                <span className="font-medium text-green-600">{formatCurrency(winnerReceives)}</span>
              </div>
              <div className="flex justify-between">
                <span>Next game gets:</span>
                <span className="font-medium text-blue-600">{formatCurrency(nextGameGets)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-2">
                <span className="font-medium">Total jackpot:</span>
                <span className="font-medium">{formatCurrency(totalJackpot)}</span>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
            <strong>Note:</strong> Completing this action will end the current game immediately.
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="secondary" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Completing Game...' : 'Complete Game'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
