
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, DollarSign, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { WeekHeader } from './WeekHeader';
import { WinnerInformation } from './WinnerInformation';
import { DailyEntriesList } from './DailyEntriesList';
import { WeekSummaryStats } from './WeekSummaryStats';
import { formatDateStringForDisplay, getTodayDateString } from '@/lib/dateUtils';
import { useTicketSales } from '@/hooks/useTicketSales';

interface TicketSalesTableProps {
  week: any;
  game: any;
  currentGameId: string | null;
  games: any[];
  setGames: (games: any[]) => void;
  onToggleWeek: (weekId: string | null) => void;
  onOpenWinnerForm: (gameId: string, weekId: string) => void;
  onOpenPayoutSlip: (winnerData: any) => void;
  onOpenExpenseModal?: (date: string, gameId: string) => void;
  onOpenDonationModal?: (date: string, gameId: string) => void;
  onRefreshData?: () => void;
}

export const TicketSalesTable = ({
  week,
  game,
  currentGameId,
  games,
  setGames,
  onToggleWeek,
  onOpenWinnerForm,
  onOpenPayoutSlip,
  onOpenExpenseModal,
  onOpenDonationModal,
  onRefreshData
}: TicketSalesTableProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [salesData, setSalesData] = useState<any[]>([]);
  const [totalTicketsSold, setTotalTicketsSold] = useState(0);
  const [totalJackpot, setTotalJackpot] = useState(0);
  
  const { 
    handleTicketInputChange, 
    handleTicketInputSubmit, 
    tempTicketInputs 
  } = useTicketSales();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const fetchSalesData = async () => {
    if (!user?.id || !week?.id) return;
    try {
      const { data, error } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('week_id', week.id)
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;

      setSalesData(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to fetch ticket sales: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const calculateTotals = () => {
    const tickets = salesData.reduce((acc, entry) => acc + entry.tickets_sold, 0);
    const jackpot = salesData.reduce((acc, entry) => acc + entry.jackpot_total, 0);
    setTotalTicketsSold(tickets);
    setTotalJackpot(jackpot);
  };

  const handleDeleteWeek = async (weekId: string) => {
    if (!user?.id) return;
    
    try {
      // Delete all ticket sales for this week first
      await supabase
        .from('ticket_sales')
        .delete()
        .eq('week_id', weekId)
        .eq('user_id', user.id);
      
      // Delete the week
      await supabase
        .from('weeks')
        .delete()
        .eq('id', weekId)
        .eq('user_id', user.id);
      
      toast({
        title: "Week Deleted",
        description: "Week and all associated data have been deleted successfully.",
      });
      
      // Close the expanded week and refresh data
      onToggleWeek(null);
      if (onRefreshData) {
        onRefreshData();
      }
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete week",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [week?.id, user?.id]);

  useEffect(() => {
    calculateTotals();
  }, [salesData]);

  // Calculate week summary stats
  const weekTotalTickets = week?.ticket_sales?.reduce((sum: number, sale: any) => sum + sale.tickets_sold, 0) || 0;
  const weekTotalSales = week?.ticket_sales?.reduce((sum: number, sale: any) => sum + sale.amount_collected, 0) || 0;
  const weekOrganizationTotal = week?.ticket_sales?.reduce((sum: number, sale: any) => sum + sale.organization_total, 0) || 0;
  const weekJackpotTotal = week?.ticket_sales?.reduce((sum: number, sale: any) => sum + sale.jackpot_total, 0) || 0;
  const displayedEndingJackpot = week?.ticket_sales?.[week.ticket_sales.length - 1]?.displayed_jackpot_total || 0;
  const hasWinner = week?.winner_name ? true : false;

  // Create winners array for WinnerInformation component
  const winners = hasWinner ? [{
    name: week.winner_name,
    slot: week.slot_chosen,
    card: week.card_selected,
    amount: week.weekly_payout || 0,
    present: week.winner_present,
    date: week.end_date,
    gameName: game.name,
    gameNumber: game.game_number,
    weekNumber: week.week_number
  }] : [];

  return (
    <Card className="mt-4 border-2 border-[#A1E96C] bg-white">
      <CardContent className="p-6">
        <WeekHeader 
          week={week} 
          onToggleWeek={onToggleWeek}
          onDeleteWeek={handleDeleteWeek}
        />
        
        <WeekSummaryStats
          weekTotalTickets={weekTotalTickets}
          weekTotalSales={weekTotalSales}
          weekOrganizationTotal={weekOrganizationTotal}
          weekJackpotTotal={weekJackpotTotal}
          displayedEndingJackpot={displayedEndingJackpot}
          hasWinner={hasWinter}
          formatCurrency={formatCurrency}
        />

        <WinnerInformation
          winners={winners}
          formatCurrency={formatCurrency}
        />

        <DailyEntriesList
          week={week}
          tempTicketInputs={tempTicketInputs}
          formatCurrency={formatCurrency}
          onInputChange={handleTicketInputChange}
          onInputSubmit={handleTicketInputSubmit}
          currentGameId={currentGameId}
          games={games}
          setGames={setGames}
          onOpenExpenseModal={onOpenExpenseModal}
          onOpenDonationModal={onOpenDonationModal}
        />
      </CardContent>
    </Card>
  );
};
