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
  const [newEntry, setNewEntry] = useState({
    date: getTodayDateString(),
    tickets_sold: 0,
    jackpot_total: 0,
    game_id: game.id,
    week_id: week.id,
    user_id: user?.id,
  });
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [totalTicketsSold, setTotalTicketsSold] = useState(0);
  const [totalJackpot, setTotalJackpot] = useState(0);
  const [winner, setWinner] = useState<any>(null);

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

  const fetchWinner = async () => {
    if (!week?.id || !user?.id) return;
    try {
      const { data, error } = await supabase
        .from('winners')
        .select('*')
        .eq('week_id', week.id)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== '404') throw error;

      setWinner(data || null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to fetch winner: ${error.message}`,
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewEntry(prevState => ({
      ...prevState,
      [name]: name === 'tickets_sold' || name === 'jackpot_total' ? parseFloat(value) : value
    }));
  };

  const addDailyEntry = async () => {
    if (!user?.id) return;
    setIsAddingEntry(true);

    try {
      const { data, error } = await supabase
        .from('ticket_sales')
        .insert([newEntry])
        .select();

      if (error) throw error;

      setSalesData([...salesData, data![0]]);
      setNewEntry({ ...newEntry, tickets_sold: 0, jackpot_total: 0 });
      toast({
        title: "Entry Added",
        description: "Daily entry has been added successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to add entry: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsAddingEntry(false);
    }
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
    fetchWinner();
  }, [week?.id, user?.id]);

  useEffect(() => {
    calculateTotals();
  }, [salesData]);

  return (
    <Card className="mt-4 border-2 border-[#A1E96C] bg-white">
      <CardContent className="p-6">
        <WeekHeader 
          week={week} 
          onToggleWeek={onToggleWeek}
          onDeleteWeek={handleDeleteWeek}
        />
        
        <WeekSummaryStats
          totalTicketsSold={totalTicketsSold}
          totalJackpot={totalJackpot}
          game={game}
          week={week}
          onOpenExpenseModal={onOpenExpenseModal}
          onOpenDonationModal={onOpenDonationModal}
        />

        <WinnerInformation
          winner={winner}
          week={week}
          game={game}
          onOpenWinnerForm={onOpenWinnerForm}
          onOpenPayoutSlip={onOpenPayoutSlip}
        />

        <div className="mb-4">
          <h4 className="text-lg font-semibold mb-2">Add Daily Entry</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                type="date"
                id="date"
                name="date"
                value={newEntry.date}
                onChange={handleInputChange}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="tickets_sold">Tickets Sold</Label>
              <Input
                type="number"
                id="tickets_sold"
                name="tickets_sold"
                value={newEntry.tickets_sold === 0 ? '' : newEntry.tickets_sold}
                onChange={handleInputChange}
                className="w-full"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="jackpot_total">Jackpot Total</Label>
              <Input
                type="number"
                id="jackpot_total"
                name="jackpot_total"
                value={newEntry.jackpot_total === 0 ? '' : newEntry.jackpot_total}
                onChange={handleInputChange}
                className="w-full"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <Button
            onClick={addDailyEntry}
            disabled={isAddingEntry}
            className="mt-4 bg-[#1F4E4A] hover:bg-[#1F4E4A]/90"
          >
            {isAddingEntry ? "Adding..." : <><Plus className="h-4 w-4 mr-2" /> Add Entry</>}
          </Button>
        </div>

        <DailyEntriesList
          salesData={salesData}
          setSalesData={setSalesData}
          week={week}
          formatCurrency={formatCurrency}
          fetchSalesData={fetchSalesData}
        />
      </CardContent>
    </Card>
  );
};
