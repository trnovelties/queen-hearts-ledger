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

      // Get ALL ticket sales for this game ordered by date
      const { data: allGameSales, error: salesError } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', user?.id)
        .order('date', { ascending: true });

      if (salesError) throw salesError;

      // Get game info for carryover
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('carryover_jackpot')
        .eq('id', gameId)
        .eq('user_id', user?.id)
        .single();

      if (gameError) throw gameError;

      // Get ALL completed weeks BEFORE this week to subtract their payouts
      const { data: completedWeeks, error: weeksError } = await supabase
        .from('weeks')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', user?.id)
        .not('winner_name', 'is', null);

      if (weeksError) throw weeksError;

      console.log('All game sales found:', allGameSales?.length || 0);
      console.log('Completed weeks found:', completedWeeks?.length || 0);
      console.log('Carryover jackpot:', gameData?.carryover_jackpot || 0);

      // Start with carryover jackpot
      let totalJackpotContributions = gameData?.carryover_jackpot || 0;

      // Add ALL jackpot contributions from ticket sales
      for (const sale of allGameSales || []) {
        totalJackpotContributions += sale.jackpot_total;
        console.log(`Adding jackpot contribution from ${sale.date}: $${sale.jackpot_total}`);
      }

      console.log('Total jackpot contributions:', totalJackpotContributions);

      // Subtract ALL payouts from completed weeks EXCEPT current week
      let totalPreviousPayouts = 0;
      for (const week of completedWeeks || []) {
        if (week.id !== weekId && week.weekly_payout > 0) {
          totalPreviousPayouts += week.weekly_payout;
          console.log(`Subtracting payout from week ${week.week_number}: $${week.weekly_payout}`);
        }
      }

      console.log('Total previous payouts:', totalPreviousPayouts);
      console.log('Current week payout:', weeklyPayout);

      // Calculate ending jackpot: Total contributions - Previous payouts - Current payout
      const endingJackpotTotal = totalJackpotContributions - totalPreviousPayouts - weeklyPayout;

      console.log('Final calculation:', totalJackpotContributions, '-', totalPreviousPayouts, '-', weeklyPayout, '=', endingJackpotTotal);
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
