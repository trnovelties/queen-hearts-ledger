
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from "@/context/AuthContext";

export const useWeekTotalsUpdater = () => {
  const { user } = useAuth();

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

  return { updateWeekTotals };
};
