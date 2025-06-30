
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from "@/context/AuthContext";
import { calculateGameJackpotLoss } from '@/utils/jackpotCalculations';

export const useGameTotalsUpdater = () => {
  const { user } = useAuth();

  const updateGameTotals = async (gameId: string) => {
    if (!user?.id) return;

    const { data: gameSales } = await supabase
      .from('ticket_sales')
      .select('*')
      .eq('game_id', gameId)
      .eq('user_id', user.id);

    if (gameSales) {
      const gameTotalSales = gameSales.reduce((sum: number, sale: any) => sum + sale.amount_collected, 0);
      const gameTotalOrganization = gameSales.reduce((sum: number, sale: any) => sum + sale.organization_total, 0);

      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', user.id);

      // Get total payouts from completed weeks
      const { data: weeks } = await supabase
        .from('weeks')
        .select('weekly_payout')
        .eq('game_id', gameId)
        .eq('user_id', user.id);

      // Get game info including contribution
      const { data: gameInfo } = await supabase
        .from('games')
        .select('jackpot_contribution_to_next_game, minimum_starting_jackpot')
        .eq('id', gameId)
        .eq('user_id', user.id)
        .single();

      const totalExpenses = expenses?.filter(e => !e.is_donation).reduce((sum: number, e: any) => sum + e.amount, 0) || 0;
      const totalDonations = expenses?.filter(e => e.is_donation).reduce((sum: number, e: any) => sum + e.amount, 0) || 0;
      const totalPayouts = weeks?.reduce((sum: number, week: any) => sum + (week.weekly_payout || 0), 0) || 0;
      const jackpotContribution = gameInfo?.jackpot_contribution_to_next_game || 0;
      
      // Calculate organization net profit: organization portion - expenses - donations
      const organizationNetProfit = gameTotalOrganization - totalExpenses - totalDonations;

      // Calculate game profit/loss using the existing jackpot calculation
      let gameJackpotLoss = 0;
      try {
        const minimumJackpot = gameInfo?.minimum_starting_jackpot || 500;
        const jackpotResult = await calculateGameJackpotLoss(gameId, user.id, minimumJackpot);
        gameJackpotLoss = jackpotResult.totalJackpotLoss;
        
        // Adjust for contribution - if winner contributed, it reduces the loss
        gameJackpotLoss = Math.max(0, gameJackpotLoss - jackpotContribution);
      } catch (error) {
        console.error('Error calculating game jackpot loss:', error);
        gameJackpotLoss = 0;
      }

      await supabase
        .from('games')
        .update({
          total_sales: gameTotalSales,
          total_payouts: totalPayouts,
          total_expenses: totalExpenses,
          total_donations: totalDonations,
          organization_net_profit: organizationNetProfit,
          game_profit_loss: -gameJackpotLoss // Negative because it's a loss
        })
        .eq('id', gameId)
        .eq('user_id', user.id);
    }
  };

  return { updateGameTotals };
};
