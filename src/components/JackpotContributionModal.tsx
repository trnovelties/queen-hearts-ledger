
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

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
      // Update the current game with the contribution amount
      const { error: gameError } = await supabase
        .from('games')
        .update({
          jackpot_contribution_to_next_game: contribution,
          end_date: new Date().toISOString().split('T')[0] // End the current game
        })
        .eq('id', gameId)
        .eq('user_id', user.id);

      if (gameError) throw gameError;

      // Calculate the actual carryover (remaining jackpot after contribution)
      const actualCarryover = totalJackpot - contribution;

      // Find the next game (if any) and update its carryover_jackpot
      const { data: nextGame, error: nextGameError } = await supabase
        .from('games')
        .select('id, carryover_jackpot')
        .eq('user_id', user.id)
        .is('end_date', null)
        .neq('id', gameId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (nextGame && !nextGameError) {
        // Update existing next game
        const { error: updateError } = await supabase
          .from('games')
          .update({
            carryover_jackpot: nextGame.carryover_jackpot + actualCarryover
          })
          .eq('id', nextGame.id)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      }
      // If no next game exists, that's fine - the carryover will be handled when a new game is created

      toast({
        title: "Contribution Recorded",
        description: `${winnerName} receives ${formatCurrency(winnerReceives)}. ${formatCurrency(nextGameGets)} contributed to next game.`,
      });

      onComplete();
      onOpenChange(false);
      
      // Reset form
      setContribution(0);

    } catch (error: any) {
      console.error('Error recording jackpot contribution:', error);
      toast({
        title: "Error",
        description: `Failed to record contribution: ${error.message}`,
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
          <DialogTitle>Jackpot Contribution</DialogTitle>
          <DialogDescription>
            {winnerName} has won the Queen of Hearts! Choose how much of the {formatCurrency(totalJackpot)} jackpot to contribute to the next game.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="contribution">Contribution Amount</Label>
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
        </div>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="secondary" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Recording...' : 'Complete Game'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
