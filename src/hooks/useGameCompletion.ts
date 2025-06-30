
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from "@/context/AuthContext";

export const useGameCompletion = () => {
  const { user } = useAuth();

  const completeGameWithContribution = async (
    gameId: string,
    contributionAmount: number,
    finalWinnerPayout: number
  ) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      // Update current game with contribution and end it
      const { error: gameUpdateError } = await supabase
        .from('games')
        .update({
          end_date: new Date().toISOString().split('T')[0],
          jackpot_contribution_to_next_game: contributionAmount
        })
        .eq('id', gameId)
        .eq('user_id', user.id);

      if (gameUpdateError) throw gameUpdateError;

      // If there's a contribution, handle the carryover to next game
      if (contributionAmount > 0) {
        await handleContributionCarryover(gameId, contributionAmount);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error completing game with contribution:', error);
      throw error;
    }
  };

  const handleContributionCarryover = async (currentGameId: string, contributionAmount: number) => {
    // Get the current game details
    const { data: currentGame } = await supabase
      .from('games')
      .select('game_number')
      .eq('id', currentGameId)
      .eq('user_id', user!.id)
      .single();

    if (!currentGame) return;

    // Look for the next game by game_number
    const { data: nextGame } = await supabase
      .from('games')
      .select('id, carryover_jackpot')
      .eq('game_number', currentGame.game_number + 1)
      .eq('user_id', user!.id)
      .maybeSingle();

    if (nextGame) {
      // Update existing next game
      const { error } = await supabase
        .from('games')
        .update({
          carryover_jackpot: nextGame.carryover_jackpot + contributionAmount
        })
        .eq('id', nextGame.id)
        .eq('user_id', user!.id);

      if (error) throw error;
    }
    // If no next game exists yet, the contribution will be handled when the next game is created
    // The GameForm already looks for the latest completed game's contribution when creating new games
  };

  return {
    completeGameWithContribution
  };
};
