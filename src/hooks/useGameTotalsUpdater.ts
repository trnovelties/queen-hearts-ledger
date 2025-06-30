
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from "@/context/AuthContext";

export const useGameTotalsUpdater = () => {
  const { user } = useAuth();

  const updateGameTotals = async (gameId: string) => {
    if (!user?.id) return;

    console.log('🔄 Updating game totals for game:', gameId);

    // Get all ticket sales for this game
    const { data: gameSales } = await supabase
      .from('ticket_sales')
      .select('*')
      .eq('game_id', gameId)
      .eq('user_id', user.id);

    if (gameSales) {
      const gameTotalSales = gameSales.reduce((sum: number, sale: any) => sum + sale.amount_collected, 0);
      const gameTotalOrganization = gameSales.reduce((sum: number, sale: any) => sum + sale.organization_total, 0);

      console.log('💰 Game Total Sales:', gameTotalSales);
      console.log('🏢 Game Total Organization:', gameTotalOrganization);

      // Get expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', user.id);

      // Get all weeks and their payouts
      const { data: weeks } = await supabase
        .from('weeks')
        .select('weekly_payout, card_selected')
        .eq('game_id', gameId)
        .eq('user_id', user.id);

      const totalExpenses = expenses?.filter(e => !e.is_donation).reduce((sum: number, e: any) => sum + e.amount, 0) || 0;
      const totalDonations = expenses?.filter(e => e.is_donation).reduce((sum: number, e: any) => sum + e.amount, 0) || 0;
      
      // Calculate total payouts correctly - sum all weekly payouts (including Queen of Hearts)
      const totalPayouts = weeks?.reduce((sum: number, week: any) => sum + (week.weekly_payout || 0), 0) || 0;
      
      console.log('💸 Total Payouts from weeks:', totalPayouts);
      console.log('💳 Total Expenses:', totalExpenses);
      console.log('🎁 Total Donations:', totalDonations);
      
      // Calculate organization net profit: organization portion - expenses - donations
      const organizationNetProfit = gameTotalOrganization - totalExpenses - totalDonations;

      console.log('📊 Organization Net Profit (before shortfall):', organizationNetProfit);

      // Update game totals in database
      const { error: updateError } = await supabase
        .from('games')
        .update({
          total_sales: gameTotalSales,
          total_payouts: totalPayouts,
          total_expenses: totalExpenses,
          total_donations: totalDonations,
          organization_net_profit: organizationNetProfit
        })
        .eq('id', gameId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('❌ Error updating game totals:', updateError);
      } else {
        console.log('✅ Game totals updated successfully');
      }
    }
  };

  return { updateGameTotals };
};
