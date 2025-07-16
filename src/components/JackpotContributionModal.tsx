
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getTodayDateString } from "@/lib/dateUtils";
import { toast } from "sonner";
import { useGameTotalsUpdater } from "@/hooks/useGameTotalsUpdater";

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
  const [winnerPresent, setWinnerPresent] = useState<string>("present");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [penaltyPercentage, setPenaltyPercentage] = useState<number>(10);
  const { toast: shadcnToast } = useToast();
  const { user } = useAuth();
  const { updateGameTotals } = useGameTotalsUpdater();

  // Enhanced logging when modal opens and fetch penalty percentage
  useEffect(() => {
    if (open && user?.id) {
      console.log('🎰 === JACKPOT CONTRIBUTION MODAL OPENED ===');
      console.log('🎰 Game ID:', gameId);
      console.log('🎰 Total Jackpot:', totalJackpot);
      console.log('🎰 Winner Name:', winnerName);
      console.log('🎰 User ID:', user?.id);
      
      if (!gameId) {
        console.error('🎰 ❌ No gameId provided to modal');
        toast.error("Missing game information. Cannot process jackpot contribution.");
        onOpenChange(false);
        return;
      }
      
      if (totalJackpot <= 0) {
        console.error('🎰 ❌ Invalid totalJackpot:', totalJackpot);
        toast.error("Invalid jackpot amount. Cannot process contribution.");
        onOpenChange(false);
        return;
      }
      
      if (!winnerName) {
        console.error('🎰 ❌ No winnerName provided to modal');
        toast.error("Missing winner information. Cannot process contribution.");
        onOpenChange(false);
        return;
      }
      
      // Fetch penalty percentage from configuration
      loadPenaltyConfiguration();
      
      console.log('🎰 ✅ All validation passed, modal ready for user input');
      toast.success("Jackpot contribution modal opened successfully!");
    }
  }, [open, gameId, totalJackpot, winnerName, user]);

  const loadPenaltyConfiguration = async () => {
    try {
      const { data: config, error } = await supabase
        .from('configurations')
        .select('penalty_percentage')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading penalty configuration:', error);
        // Use default 10% if configuration not found
        setPenaltyPercentage(10);
        return;
      }

      if (config) {
        setPenaltyPercentage(config.penalty_percentage || 10);
        console.log('🎰 Penalty percentage loaded:', config.penalty_percentage);
      } else {
        setPenaltyPercentage(10);
        console.log('🎰 No configuration found, using default 10% penalty');
      }
    } catch (error) {
      console.error('Error loading penalty configuration:', error);
      setPenaltyPercentage(10);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Calculate amounts based on winner presence
  const isWinnerPresent = winnerPresent === "present";
  const penaltyAmount = isWinnerPresent ? 0 : (totalJackpot * penaltyPercentage / 100);
  const winnerReceives = totalJackpot - penaltyAmount;
  const nextGameGets = penaltyAmount;

  const handleSubmit = async () => {
    if (!gameId || !user?.id) {
      console.error('🎰 ❌ Missing required data for submission');
      toast.error("Missing required information. Cannot complete game.");
      return;
    }

    // Validation - no need for complex validation since it's a radio selection
    if (!winnerPresent) {
      shadcnToast({
        title: "Selection Required",
        description: "Please select whether the winner is present or not.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('🎰 === PHASE 3: JACKPOT CONTRIBUTION PROCESSING ===');
      console.log('🎰 Game ID:', gameId);
      console.log('🎰 Total Jackpot:', totalJackpot);
      console.log('🎰 Winner Present:', isWinnerPresent);
      console.log('🎰 Penalty Percentage:', penaltyPercentage);
      console.log('🎰 Contribution to Next Game:', nextGameGets);
      console.log('🎰 Winner Receives:', winnerReceives);

      // PHASE 3: Complete the current game with proper end date
      const todayDateString = getTodayDateString();
      
      console.log('🎰 Setting game contribution first:', nextGameGets);
      
      // Calculate final winner payout considering minimum $500 guarantee
      const finalWinnerPayout = Math.max(500, winnerReceives);
      
      console.log('🎰 Final Winner Payout (minimum $500 applied):', finalWinnerPayout);
      console.log('🎰 Total Jackpot Available:', totalJackpot);
      console.log('🎰 Contribution to Next Game:', nextGameGets);
      
      // STEP 1: First set jackpot contribution WITHOUT ending the game
      const { error: contributionError } = await supabase
        .from('games')
        .update({
          jackpot_contribution_to_next_game: nextGameGets,
          total_payouts: finalWinnerPayout // Final winner gets at least $500
        })
        .eq('id', gameId)
        .eq('user_id', user.id);

      if (contributionError) {
        console.error('🎰 ❌ Error setting jackpot contribution:', contributionError);
        throw contributionError;
      }

      console.log('🎰 ✅ Jackpot contribution set successfully:', nextGameGets);

      // STEP 2: Recalculate game totals with the updated jackpot contribution (while game is still active)
      console.log('🎰 🔄 Recalculating game totals with updated contribution...');
      await updateGameTotals(gameId);
      console.log('🎰 ✅ Game totals recalculated successfully');

      // STEP 3: Now end the game
      const { error: endGameError } = await supabase
        .from('games')
        .update({
          end_date: todayDateString
        })
        .eq('id', gameId)
        .eq('user_id', user.id);

      if (endGameError) {
        console.error('🎰 ❌ Error ending game:', endGameError);
        throw endGameError;
      }

      console.log('🎰 ✅ Current game ended successfully with end_date:', todayDateString);

      // Check if there's already a next game created
      const { data: nextGame, error: nextGameError } = await supabase
        .from('games')
        .select('id, carryover_jackpot, name')
        .eq('user_id', user.id)
        .is('end_date', null)
        .neq('id', gameId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextGameError) {
        console.error('🎰 ⚠️ Error checking for next game:', nextGameError);
        // Continue anyway - this is not critical
      }

      if (nextGame) {
        // Update existing next game with additional carryover
        console.log('🎰 Updating existing next game:', nextGame.name, 'with additional carryover:', nextGameGets);
        
        const { error: updateError } = await supabase
          .from('games')
          .update({
            carryover_jackpot: (nextGame.carryover_jackpot || 0) + nextGameGets
          })
          .eq('id', nextGame.id)
          .eq('user_id', user.id);

        if (updateError) {
          console.error('🎰 ⚠️ Error updating next game carryover:', updateError);
          // This is not critical, continue
        } else {
          console.log('🎰 ✅ Next game carryover updated successfully');
        }
      } else {
        console.log('🎰 ℹ️ No existing next game found - carryover will be handled when new game is created');
      }

      console.log('🎰 === PHASE 3: COMPLETION SUCCESSFUL ===');

      // Provide detailed success feedback with minimum guarantee
      const actualWinnerReceives = Math.max(500, winnerReceives);
      toast.success(`Game completed! ${winnerName} receives ${formatCurrency(actualWinnerReceives)} (minimum $500 guaranteed). ${formatCurrency(nextGameGets)} contributed to next game.`);
      
      shadcnToast({
        title: "Game Completed Successfully",
        description: `${winnerName} receives ${formatCurrency(actualWinnerReceives)} (minimum $500 guaranteed). ${formatCurrency(nextGameGets)} contributed to next game. Game has been ended and moved to archives.`,
      });

      // Complete the process
      onComplete();
      onOpenChange(false);
      
      // Reset form
      setWinnerPresent("present");

    } catch (error: any) {
      console.error('🎰 ❌ Error completing Queen of Hearts game:', error);
      toast.error(`Failed to complete game: ${error.message}`);
      shadcnToast({
        title: "Error",
        description: `Failed to complete game: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>🎉 Queen of Hearts Won!</DialogTitle>
          <DialogDescription>
            {winnerName} has won the Queen of Hearts! Select whether the winner is present to determine the final distribution of the {formatCurrency(totalJackpot)} jackpot. This will end the current game and move it to archives.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-3">
            <Label className="text-base font-medium">Winner Attendance</Label>
            <RadioGroup 
              value={winnerPresent} 
              onValueChange={setWinnerPresent}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50">
                <RadioGroupItem value="present" id="present" />
                <Label htmlFor="present" className="flex-1 cursor-pointer">
                  <div className="font-medium text-green-700">✅ Winner is Present</div>
                  <div className="text-sm text-muted-foreground">Winner receives full jackpot amount</div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50">
                <RadioGroupItem value="not-present" id="not-present" />
                <Label htmlFor="not-present" className="flex-1 cursor-pointer">
                  <div className="font-medium text-orange-700">⚠️ Winner is Not Present</div>
                  <div className="text-sm text-muted-foreground">{penaltyPercentage}% penalty applied, goes to next game</div>
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Enhanced Summary Display */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <h4 className="font-medium mb-2">💰 Distribution Summary</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>🏆 Winner receives:</span>
                <span className="font-medium text-green-600">{formatCurrency(winnerReceives)}</span>
              </div>
              <div className="flex justify-between">
                <span>🎯 Next game gets:</span>
                <span className="font-medium text-blue-600">{formatCurrency(nextGameGets)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-2">
                <span className="font-medium">💎 Total jackpot:</span>
                <span className="font-medium">{formatCurrency(totalJackpot)}</span>
              </div>
            </div>
          </div>
          
          {!isWinnerPresent && (
            <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
              <strong>⚠️ Penalty Applied:</strong> Since the winner is not present, {penaltyPercentage}% of the jackpot ({formatCurrency(penaltyAmount)}) will be contributed to the next game.
            </div>
          )}
          
          <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
            <strong>⚠️ Important:</strong> Completing this action will end the current game immediately and move it to your archived games.
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            onClick={() => onOpenChange(false)} 
            variant="secondary" 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? 'Completing Game...' : '🎉 Complete Game'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
