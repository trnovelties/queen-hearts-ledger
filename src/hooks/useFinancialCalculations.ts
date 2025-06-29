
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

export const useFinancialCalculations = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const calculateEndingJackpotTotal = async (
    gameId: string,
    currentDate: string,
    currentJackpotTotal: number,
    carryoverJackpot: number = 0
  ) => {
    try {
      // Get all ticket sales for this game ordered by date
      const { data: allGameSales, error: salesError } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', user?.id)
        .order('date', { ascending: true });

      if (salesError) throw salesError;

      // Start with carryover jackpot
      let runningJackpotTotal = carryoverJackpot;

      // Process all sales up to and including current date
      const currentDateObj = new Date(currentDate);
      
      for (const sale of allGameSales || []) {
        const saleDate = new Date(sale.date);
        
        // Include all sales up to and including current date
        if (saleDate <= currentDateObj) {
          runningJackpotTotal += sale.jackpot_total;
        }
      }

      // Get all completed weeks (with winners) and subtract their payouts
      const { data: completedWeeks, error: weeksError } = await supabase
        .from('weeks')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', user?.id)
        .not('winner_name', 'is', null);

      if (weeksError) throw weeksError;

      // Subtract payouts from completed weeks that ended before or on current date
      for (const week of completedWeeks || []) {
        const weekEndDate = new Date(week.end_date);
        if (weekEndDate <= currentDateObj && week.weekly_payout > 0) {
          runningJackpotTotal -= week.weekly_payout;
        }
      }

      return Math.max(0, runningJackpotTotal); // Ensure never negative
    } catch (error) {
      console.error('Error calculating ending jackpot total:', error);
      return carryoverJackpot + currentJackpotTotal; // Fallback to simple calculation
    }
  };

  return {
    calculateEndingJackpotTotal
  };
};
