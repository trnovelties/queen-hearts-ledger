
import { supabase } from '@/integrations/supabase/client';

export interface JackpotCalculationResult {
  totalJackpotLoss: number;
  weeklyBreakdown: Array<{
    weekNumber: number;
    startingJackpot: number;
    contributions: number;
    payout: number;
    endingJackpot: number;
    isQueenOfHearts: boolean;
    minimumShortfall: number;
  }>;
}

export const calculateGameJackpotLoss = async (
  gameId: string,
  userId: string,
  minimumStartingJackpot: number = 500
): Promise<JackpotCalculationResult> => {
  // Get all weeks for this game ordered by week number
  const { data: weeks, error: weeksError } = await supabase
    .from('weeks')
    .select('*')
    .eq('game_id', gameId)
    .eq('user_id', userId)
    .order('week_number', { ascending: true });

  if (weeksError || !weeks) {
    throw new Error(`Failed to fetch weeks: ${weeksError?.message}`);
  }

  // Get game info for carryover jackpot
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('carryover_jackpot')
    .eq('id', gameId)
    .eq('user_id', userId)
    .single();

  if (gameError || !game) {
    throw new Error(`Failed to fetch game: ${gameError?.message}`);
  }

  let runningJackpot = game.carryover_jackpot || 0;
  let totalJackpotLoss = 0;
  const weeklyBreakdown: JackpotCalculationResult['weeklyBreakdown'] = [];

  for (const week of weeks) {
    const startingJackpot = runningJackpot;

    // Get ticket sales for this week to calculate jackpot contributions
    const { data: weekSales, error: salesError } = await supabase
      .from('ticket_sales')
      .select('jackpot_total')
      .eq('week_id', week.id)
      .eq('user_id', userId);

    if (salesError) {
      throw new Error(`Failed to fetch sales for week ${week.week_number}: ${salesError.message}`);
    }

    const weekJackpotContributions = weekSales?.reduce((sum, sale) => sum + sale.jackpot_total, 0) || 0;
    const totalAvailableJackpot = startingJackpot + weekJackpotContributions;
    
    const weeklyPayout = week.weekly_payout || 0;
    const isQueenOfHearts = week.card_selected === 'Queen of Hearts';
    
    let minimumShortfall = 0;
    let actualPayout = weeklyPayout;

    if (isQueenOfHearts && weeklyPayout > 0) {
      // When Queen of Hearts is drawn, check against minimum jackpot
      if (totalAvailableJackpot < minimumStartingJackpot) {
        minimumShortfall = minimumStartingJackpot - totalAvailableJackpot;
        actualPayout = minimumStartingJackpot; // Organization had to pay minimum
        totalJackpotLoss += minimumShortfall;
      }
      runningJackpot = 0; // Game ends, jackpot resets
    } else {
      // Regular payout, deduct from available jackpot
      runningJackpot = totalAvailableJackpot - weeklyPayout;
    }

    weeklyBreakdown.push({
      weekNumber: week.week_number,
      startingJackpot,
      contributions: weekJackpotContributions,
      payout: actualPayout,
      endingJackpot: runningJackpot,
      isQueenOfHearts,
      minimumShortfall
    });
  }

  return {
    totalJackpotLoss,
    weeklyBreakdown
  };
};
