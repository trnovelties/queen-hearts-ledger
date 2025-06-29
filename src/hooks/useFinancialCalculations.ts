
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from "@/context/AuthContext";

export const useFinancialCalculations = () => {
  const { user } = useAuth();

  const calculateWeekEndingJackpot = async (
    gameId: string,
    weekId: string,
    weeklyPayout: number = 0
  ) => {
    try {
      console.log('=== WEEK-LEVEL ENDING JACKPOT CALCULATION ===');
      console.log('Game ID:', gameId);
      console.log('Week ID:', weekId);
      console.log('Weekly Payout:', weeklyPayout);

      // Get current week info
      const { data: currentWeek, error: weekError } = await supabase
        .from('weeks')
        .select('week_number')
        .eq('id', weekId)
        .eq('user_id', user?.id)
        .single();

      if (weekError) throw weekError;

      // Get previous week's stored ending jackpot (or game carryover for Week 1)
      let previousEndingJackpot = 0;
      if (currentWeek.week_number > 1) {
        const { data: previousWeek, error: prevWeekError } = await supabase
          .from('weeks')
          .select('ending_jackpot')
          .eq('game_id', gameId)
          .eq('week_number', currentWeek.week_number - 1)
          .eq('user_id', user?.id)
          .single();

        if (prevWeekError || !previousWeek) {
          console.warn('Could not find previous week, using game carryover');
          // Fallback to game carryover if previous week not found
          const { data: gameData, error: gameError } = await supabase
            .from('games')
            .select('carryover_jackpot')
            .eq('id', gameId)
            .eq('user_id', user?.id)
            .single();

          if (gameError) throw gameError;
          previousEndingJackpot = gameData?.carryover_jackpot || 0;
        } else {
          previousEndingJackpot = previousWeek.ending_jackpot || 0;
        }
      } else {
        // Week 1 starts with game's carryover jackpot
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('carryover_jackpot')
          .eq('id', gameId)
          .eq('user_id', user?.id)
          .single();

        if (gameError) throw gameError;
        previousEndingJackpot = gameData?.carryover_jackpot || 0;
      }

      // Get current week's jackpot contributions
      const { data: weekSales, error: salesError } = await supabase
        .from('ticket_sales')
        .select('jackpot_total')
        .eq('week_id', weekId)
        .eq('user_id', user?.id);

      if (salesError) throw salesError;

      const currentWeekJackpotContributions = weekSales?.reduce((sum, sale) => sum + sale.jackpot_total, 0) || 0;

      console.log('Previous week ending jackpot:', previousEndingJackpot);
      console.log('Current week jackpot contributions:', currentWeekJackpotContributions);

      // Calculate ending jackpot: Previous ending jackpot + current contributions - payout
      const endingJackpotTotal = previousEndingJackpot + currentWeekJackpotContributions - weeklyPayout;

      console.log('Final calculation:', previousEndingJackpot, '+', currentWeekJackpotContributions, '-', weeklyPayout, '=', endingJackpotTotal);
      console.log('=== WEEK-LEVEL CALCULATION END ===');

      return Math.max(0, endingJackpotTotal); // Ensure never negative
    } catch (error) {
      console.error('Error calculating week ending jackpot:', error);
      return 0; // Fallback
    }
  };

  // Keep the old function for compatibility but mark it as deprecated
  const calculateEndingJackpotTotal = async (
    gameId: string,
    currentDate: string,
    currentJackpotTotal: number,
    carryoverJackpot: number = 0
  ) => {
    console.warn('calculateEndingJackpotTotal is deprecated, use calculateWeekEndingJackpot instead');
    return calculateWeekEndingJackpot(gameId, '', 0);
  };

  return {
    calculateEndingJackpotTotal,
    calculateWeekEndingJackpot
  };
};
