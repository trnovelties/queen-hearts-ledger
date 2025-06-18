
import { supabase } from "@/integrations/supabase/client";

export const createWeeksForGame = async (gameId: string, userId: string, weeksToCreate: any[]) => {
  const weeksWithUserId = weeksToCreate.map(week => ({
    ...week,
    user_id: userId
  }));

  const { error } = await supabase
    .from('weeks')
    .insert(weeksWithUserId);

  if (error) throw error;
};

export const insertTicketSales = async (ticketSalesData: any[], userId: string) => {
  const salesWithUserId = ticketSalesData.map(sale => ({
    ...sale,
    user_id: userId
  }));

  const { error } = await supabase
    .from('ticket_sales')
    .insert(salesWithUserId);

  if (error) throw error;
};

export const insertExpense = async (expenseData: any, userId: string) => {
  const expenseWithUserId = {
    ...expenseData,
    user_id: userId
  };

  const { error } = await supabase
    .from('expenses')
    .insert(expenseWithUserId);

  if (error) throw error;
};
