
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from "@/context/AuthContext";

export const useFinancialCalculations = () => {
  const { user } = useAuth();

  const calculateEndingJackpotTotal = async (
    gameId: string,
    currentDate: string,
    currentJackpotTotal: number,
    carryoverJackpot: number = 0
  ) => {
    try {
      console.log('=== ENDING JACKPOT CALCULATION START ===');
      console.log('Game ID:', gameId);
      console.log('Current Date:', currentDate);
      console.log('Current Jackpot Total:', currentJackpotTotal);
      console.log('Carryover Jackpot:', carryoverJackpot);

      // Get all ticket sales for this game ordered by date
      const { data: allGameSales, error: salesError } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', user?.id)
        .order('date', { ascending: true });

      if (salesError) throw salesError;

      // Start with carryover jackpot
      let totalJackpotContributions = carryoverJackpot;

      // Process all sales up to and including current date
      const currentDateObj = new Date(currentDate);
      
      for (const sale of allGameSales || []) {
        const saleDate = new Date(sale.date);
        
        // Include all sales up to and including current date
        if (saleDate <= currentDateObj) {
          totalJackpotContributions += sale.jackpot_total;
        }
      }

      console.log('Total Jackpot Contributions (including carryover):', totalJackpotContributions);

      // Get ALL completed weeks (with winners) and subtract their payouts
      const { data: completedWeeks, error: weeksError } = await supabase
        .from('weeks')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', user?.id)
        .not('winner_name', 'is', null);

      if (weeksError) throw weeksError;

      console.log('Completed weeks found:', completedWeeks?.length || 0);

      // Subtract ALL payouts from completed weeks (no date restriction)
      let totalPayouts = 0;
      for (const week of completedWeeks || []) {
        if (week.weekly_payout > 0) {
          console.log(`Week ${week.week_number}: Payout $${week.weekly_payout} for winner ${week.winner_name}`);
          totalPayouts += week.weekly_payout;
        }
      }

      console.log('Total Payouts to subtract:', totalPayouts);

      // Add current entry's jackpot contribution
      const finalEndingJackpotTotal = totalJackpotContributions + currentJackpotTotal - totalPayouts;
      
      console.log('Final calculation:', totalJackpotContributions, '+', currentJackpotTotal, '-', totalPayouts, '=', finalEndingJackpotTotal);
      console.log('=== ENDING JACKPOT CALCULATION END ===');

      return Math.max(0, finalEndingJackpotTotal); // Ensure never negative
    } catch (error) {
      console.error('Error calculating ending jackpot total:', error);
      return carryoverJackpot + currentJackpotTotal; // Fallback to simple calculation
    }
  };

  return {
    calculateEndingJackpotTotal
  };
};
