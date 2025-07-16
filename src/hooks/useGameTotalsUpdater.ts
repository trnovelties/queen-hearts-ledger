
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from "@/context/AuthContext";

export const useGameTotalsUpdater = () => {
  const { user } = useAuth();

  const updateGameTotals = async (gameId: string) => {
    if (!user?.id) return;

    console.log('🔄 Updating game totals for game:', gameId);

    // First check if this is a completed game - if so, don't recalculate
    const { data: gameCheck } = await supabase
      .from('games')
      .select('end_date, name')
      .eq('id', gameId)
      .eq('user_id', user.id)
      .single();

    if (gameCheck?.end_date) {
      console.log('⏭️ Skipping totals update for completed game:', gameCheck.name);
      return;
    }

    // Get all ticket sales for this game
    const { data: gameSales } = await supabase
      .from('ticket_sales')
      .select('*')
      .eq('game_id', gameId)
      .eq('user_id', user.id);

    if (gameSales) {
      // Get game data to access carryover jackpot and percentages
      const { data: gameData } = await supabase
        .from('games')
        .select('carryover_jackpot, organization_percentage, jackpot_percentage, jackpot_contribution_to_next_game, name, end_date, minimum_starting_jackpot')
        .eq('id', gameId)
        .eq('user_id', user.id)
        .single();

      const carryoverJackpot = gameData?.carryover_jackpot || 0;
      const organizationPercentage = gameData?.organization_percentage || 40;
      const jackpotPercentage = gameData?.jackpot_percentage || 60;

      // Calculate totals from actual sales
      const salesTotalSales = gameSales.reduce((sum: number, sale: any) => sum + sale.amount_collected, 0);
      
      // Calculate organization portion directly from sales total (not from individual records)
      const salesTotalOrganization = salesTotalSales * (organizationPercentage / 100);

      // Total sales should NOT include carryover - only actual ticket sales
      const gameTotalSales = salesTotalSales;
      const gameTotalOrganization = salesTotalOrganization;

      console.log('💰 Sales from Tickets:', salesTotalSales);
      console.log('🎯 Carryover Jackpot:', carryoverJackpot);
      console.log('💰 Game Total Sales (ticket sales only):', gameTotalSales);
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
      
      // Calculate detailed financial breakdown
      const totalJackpotContributions = gameTotalSales * (jackpotPercentage / 100);
      
      // Total payouts equals total jackpot contributions (what's allocated for payouts)
      const totalPayouts = totalJackpotContributions;
      
      console.log('💰 Total Jackpot Contributions:', totalJackpotContributions);
      console.log('💸 Total Payouts (should equal jackpot contributions):', totalPayouts);
      console.log('💳 Total Expenses:', totalExpenses);
      console.log('🎁 Total Donations:', totalDonations);
      
      // Calculate organization net profit: organization portion (before expenses/donations)
      const organizationNetProfit = gameTotalOrganization;

      // Separate weekly payouts from final jackpot payout
      const weeklyPayoutsDistributed = weeks?.filter(w => w.card_selected !== 'Queen of Hearts').reduce((sum: number, week: any) => sum + (week.weekly_payout || 0), 0) || 0;
      
      // Calculate final jackpot payout based on whether shortfall occurred
      const queenOfHeartsWeeks = weeks?.filter(w => w.card_selected === 'Queen of Hearts') || [];
      let finalJackpotPayout = 0;
      
      if (queenOfHeartsWeeks.length > 0) {
        // Calculate net available for comparison
        const tempNetAvailable = totalJackpotContributions - weeklyPayoutsDistributed - (gameData?.jackpot_contribution_to_next_game || 0);
        const minimumJackpot = gameData?.minimum_starting_jackpot || 500;
        
        // If there's a shortfall, the final payout should be the minimum guaranteed amount
        if (tempNetAvailable < minimumJackpot) {
          finalJackpotPayout = minimumJackpot;
        } else {
          // No shortfall, use the actual weekly payout amount
          finalJackpotPayout = queenOfHeartsWeeks.reduce((sum: number, week: any) => sum + (week.weekly_payout || 0), 0);
        }
      }
      
      // Get existing jackpot contribution to next game from database
      console.log('🔍 RAW DATABASE VALUE for jackpot_contribution_to_next_game:', gameData?.jackpot_contribution_to_next_game);
      console.log('🔍 gameData object:', gameData);
      
      // Use the actual jackpot_contribution_to_next_game value from database
      const jackpotContributionToNextGame = gameData?.jackpot_contribution_to_next_game || 0;
      
      console.log('🔍 DEBUGGING VALUES FOR GAME:', gameData?.name);
      console.log('📊 Total Jackpot Contributions:', totalJackpotContributions);
      console.log('💸 Weekly Payouts Distributed:', weeklyPayoutsDistributed);
      console.log('🎯 Jackpot Contribution to Next Game:', jackpotContributionToNextGame);
      console.log('🧮 Calculation: netAvailable = totalContributions - weeklyPayouts - nextGameContribution');
      console.log('🧮 Calculation:', totalJackpotContributions, '-', weeklyPayoutsDistributed, '-', jackpotContributionToNextGame);
      
      // Calculate net available for final winner: total contributions - weekly payouts - next game contribution
      const netAvailableForFinalWinner = totalJackpotContributions - weeklyPayoutsDistributed - jackpotContributionToNextGame;
      
      console.log('💵 CALCULATED Net Available for Final Winner:', netAvailableForFinalWinner);
      console.log('💵 EXPECTED Net Available for Final Winner (for Game 8): 430');
      
      // Calculate jackpot shortfall based on minimum jackpot guarantee vs net available amount
      const minimumJackpot = gameData?.minimum_starting_jackpot || 500;
      const jackpotShortfallCovered = Math.max(0, minimumJackpot - netAvailableForFinalWinner);
      
      console.log('⚠️ CALCULATED Jackpot Shortfall Covered:', jackpotShortfallCovered);
      console.log('⚠️ EXPECTED Jackpot Shortfall Covered (for Game 8): 70');
      
      // Calculate actual organization net profit: after expenses, donations, and shortfall coverage
      const actualOrganizationNetProfit = organizationNetProfit - totalExpenses - totalDonations - jackpotShortfallCovered;

      console.log('📊 Organization Net Profit (before expenses/donations):', organizationNetProfit);
      console.log('📈 Actual Organization Net Profit (after expenses/donations):', actualOrganizationNetProfit);
      
      // Calculate game duration in weeks
      const gameDurationWeeks = weeks?.length || 0;

      console.log('💰 Total Jackpot Contributions:', totalJackpotContributions);
      console.log('📊 Weekly Payouts Distributed:', weeklyPayoutsDistributed);
      console.log('🏆 Final Jackpot Payout:', finalJackpotPayout);
      console.log('💵 Net Available for Final Winner:', netAvailableForFinalWinner);
      console.log('⚠️ Jackpot Shortfall Covered:', jackpotShortfallCovered);
      console.log('📈 Actual Organization Net Profit:', actualOrganizationNetProfit);
      console.log('📅 Game Duration (weeks):', gameDurationWeeks);

      // Update game totals in database
      const { error: updateError } = await supabase
        .from('games')
        .update({
          total_sales: gameTotalSales,
          total_payouts: totalPayouts,
          total_expenses: totalExpenses,
          total_donations: totalDonations,
          organization_net_profit: organizationNetProfit,
          actual_organization_net_profit: actualOrganizationNetProfit,
          weekly_payouts_distributed: weeklyPayoutsDistributed,
          final_jackpot_payout: finalJackpotPayout,
          total_jackpot_contributions: totalJackpotContributions,
          net_available_for_final_winner: netAvailableForFinalWinner,
          jackpot_shortfall_covered: jackpotShortfallCovered,
          game_duration_weeks: gameDurationWeeks
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
