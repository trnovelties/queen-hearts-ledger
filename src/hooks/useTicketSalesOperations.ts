
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useFinancialCalculations } from './useFinancialCalculations';

export const useTicketSalesOperations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { calculateEndingJackpotTotal } = useFinancialCalculations();

  const updateWeekTotals = async (weekId: string) => {
    const { data: weekSales } = await supabase
      .from('ticket_sales')
      .select('*')
      .eq('week_id', weekId)
      .eq('user_id', user?.id);

    if (weekSales) {
      const weekTotalTickets = weekSales.reduce((sum: number, sale: any) => sum + sale.tickets_sold, 0);
      const weekTotalSales = weekSales.reduce((sum: number, sale: any) => sum + sale.amount_collected, 0);
      
      await supabase
        .from('weeks')
        .update({
          weekly_sales: weekTotalSales,
          weekly_tickets_sold: weekTotalTickets
        })
        .eq('id', weekId)
        .eq('user_id', user?.id);
    }
  };

  const updateGameTotals = async (gameId: string) => {
    const { data: gameSales } = await supabase
      .from('ticket_sales')
      .select('*')
      .eq('game_id', gameId)
      .eq('user_id', user?.id);

    if (gameSales) {
      const gameTotalSales = gameSales.reduce((sum: number, sale: any) => sum + sale.amount_collected, 0);
      const gameTotalOrganization = gameSales.reduce((sum: number, sale: any) => sum + sale.organization_total, 0);

      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', user?.id);

      const totalExpenses = expenses?.filter(e => !e.is_donation).reduce((sum: number, e: any) => sum + e.amount, 0) || 0;
      const totalDonations = expenses?.filter(e => e.is_donation).reduce((sum: number, e: any) => sum + e.amount, 0) || 0;
      const organizationNetProfit = gameTotalOrganization - totalExpenses - totalDonations;

      await supabase
        .from('games')
        .update({
          total_sales: gameTotalSales,
          total_expenses: totalExpenses,
          total_donations: totalDonations,
          organization_net_profit: organizationNetProfit
        })
        .eq('id', gameId)
        .eq('user_id', user?.id);
    }
  };

  const updateDailyEntry = async (
    weekId: string,
    dayIndex: number,
    ticketsSold: number,
    currentGameId: string,
    games: any[],
    setGames: (games: any[]) => void
  ) => {
    if (!currentGameId || !user?.id) return;

    try {
      const game = games.find(g => g.id === currentGameId);
      if (!game) throw new Error("Game not found");

      const week = game.weeks.find((w: any) => w.id === weekId);
      if (!week) throw new Error("Week not found");

      // Calculate the date for this day
      const weekStartDate = new Date(week.start_date);
      const entryDate = new Date(weekStartDate);
      entryDate.setDate(entryDate.getDate() + dayIndex);

      // Find existing entry for this specific date
      const existingEntry = week.ticket_sales.find((entry: any) => {
        const existingDate = new Date(entry.date);
        return existingDate.toDateString() === entryDate.toDateString();
      });

      // Calculate the basic values
      const ticketPrice = game.ticket_price;
      const amountCollected = ticketsSold * ticketPrice;
      const organizationPercentage = game.organization_percentage;
      const jackpotPercentage = game.jackpot_percentage;
      const organizationTotal = amountCollected * (organizationPercentage / 100);
      const jackpotTotal = amountCollected * (jackpotPercentage / 100);

      // Get cumulative collected up to this date
      const { data: allGameSales, error: salesError } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('game_id', currentGameId)
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (salesError) throw salesError;

      let cumulativeCollected = game.carryover_jackpot || 0;
      if (allGameSales) {
        for (const sale of allGameSales) {
          const saleDate = new Date(sale.date);
          const currentEntryDate = new Date(entryDate);

          if (saleDate < currentEntryDate || 
              (saleDate.toDateString() === currentEntryDate.toDateString() && sale.id !== existingEntry?.id)) {
            cumulativeCollected += sale.amount_collected;
          }
        }
      }
      cumulativeCollected += amountCollected;

      // Calculate ending jackpot total using the improved calculation
      const endingJackpotTotal = await calculateEndingJackpotTotal(
        currentGameId,
        entryDate.toISOString().split('T')[0],
        jackpotTotal,
        game.carryover_jackpot || 0
      );

      // Optimistically update local state first
      const updatedGames = games.map(g => {
        if (g.id !== currentGameId) return g;
        return {
          ...g,
          weeks: g.weeks.map((w: any) => {
            if (w.id !== weekId) return w;
            
            const updatedTicketSales = existingEntry 
              ? w.ticket_sales.map((entry: any) => {
                  const entryDate = new Date(entry.date);
                  const targetDate = new Date(weekStartDate);
                  targetDate.setDate(targetDate.getDate() + dayIndex);
                  if (entryDate.toDateString() === targetDate.toDateString()) {
                    return {
                      ...entry,
                      tickets_sold: ticketsSold,
                      amount_collected: amountCollected,
                      cumulative_collected: cumulativeCollected,
                      organization_total: organizationTotal,
                      jackpot_total: jackpotTotal,
                      ending_jackpot_total: endingJackpotTotal
                    };
                  }
                  return entry;
                })
              : [...w.ticket_sales, {
                  id: `temp-${Date.now()}`,
                  game_id: currentGameId,
                  week_id: weekId,
                  date: entryDate.toISOString().split('T')[0],
                  tickets_sold: ticketsSold,
                  ticket_price: ticketPrice,
                  amount_collected: amountCollected,
                  cumulative_collected: cumulativeCollected,
                  organization_total: organizationTotal,
                  jackpot_total: jackpotTotal,
                  ending_jackpot_total: endingJackpotTotal
                }];

            // Recalculate week totals
            const weekTotalTickets = updatedTicketSales.reduce((sum: number, entry: any) => sum + entry.tickets_sold, 0);
            const weekTotalSales = updatedTicketSales.reduce((sum: number, entry: any) => sum + entry.amount_collected, 0);
            
            return {
              ...w,
              ticket_sales: updatedTicketSales,
              weekly_tickets_sold: weekTotalTickets,
              weekly_sales: weekTotalSales
            };
          })
        };
      });

      setGames(updatedGames);

      if (existingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('ticket_sales')
          .update({
            date: entryDate.toISOString().split('T')[0],
            tickets_sold: ticketsSold,
            ticket_price: ticketPrice,
            amount_collected: amountCollected,
            cumulative_collected: cumulativeCollected,
            organization_total: organizationTotal,
            jackpot_total: jackpotTotal,
            ending_jackpot_total: endingJackpotTotal
          })
          .eq('id', existingEntry.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new entry
        const { error } = await supabase
          .from('ticket_sales')
          .insert([{
            game_id: currentGameId,
            week_id: weekId,
            date: entryDate.toISOString().split('T')[0],
            tickets_sold: ticketsSold,
            ticket_price: ticketPrice,
            amount_collected: amountCollected,
            cumulative_collected: cumulativeCollected,
            organization_total: organizationTotal,
            jackpot_total: jackpotTotal,
            ending_jackpot_total: endingJackpotTotal,
            user_id: user.id
          }]);

        if (error) throw error;
      }

      // Update week and game totals
      await updateWeekTotals(weekId);
      await updateGameTotals(currentGameId);

    } catch (error: any) {
      console.error('Error updating daily entry:', error);
      toast({
        title: "Error",
        description: `Failed to update daily entry: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return {
    updateDailyEntry,
    updateWeekTotals,
    updateGameTotals
  };
};
