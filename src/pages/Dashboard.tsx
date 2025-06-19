import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { useAdmin } from '@/context/AdminContext';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DatePickerWithInput } from "@/components/ui/datepicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketSalesRow } from "@/components/TicketSalesRow";
import { ExpenseForm } from "@/components/ExpenseForm";
import { format, parseISO, addDays } from 'date-fns';
import { PlusCircle, Trash2, Edit, Save, X, DollarSign, Calendar, BarChart3, Settings, ChevronRight, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { formatDateForDatabase, addDaysToDate, getWeekDayDate, isSameDay } from "@/lib/dateUtils";

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const { adminMode, currentOrganization } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [games, setGames] = useState<any[]>([]);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});
  const [tempTicketInputs, setTempTicketInputs] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameFormOpen, setGameFormOpen] = useState(false);
  const [weekFormOpen, setWeekFormOpen] = useState(false);
  const [gameForm, setGameForm] = useState({
    name: '',
    ticketPrice: 5,
    organizationPercentage: 50,
    jackpotPercentage: 50,
    minimumStartingJackpot: 500,
    carryoverJackpot: 0
  });
  const [weekForm, setWeekForm] = useState({
    weekNumber: 1,
    startDate: new Date()
  });
  const [dailyExpenseModalOpen, setDailyExpenseModalOpen] = useState(false);
  const [dailyExpenseDate, setDailyExpenseDate] = useState<string | null>(null);
  const [dailyExpenseGameId, setDailyExpenseGameId] = useState<string | null>(null);
  const [ticketSalesOpen, setTicketSalesOpen] = useState(false);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchGames();
  }, [user, navigate, adminMode, currentOrganization]);

  const fetchGames = async () => {
    try {
      setIsLoading(true);
      
      // Determine which user ID to use for fetching games
      const targetUserId = adminMode && currentOrganization ? currentOrganization.id : user?.id;
      
      if (!targetUserId) {
        throw new Error("No user ID available");
      }

      // Fetch games for the user
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (gamesError) throw gamesError;

      // If no games, set empty array and return
      if (!gamesData || gamesData.length === 0) {
        setGames([]);
        setIsLoading(false);
        return;
      }

      // Fetch weeks for each game
      const gamesWithWeeks = await Promise.all(gamesData.map(async (game) => {
        const { data: weeksData, error: weeksError } = await supabase
          .from('weeks')
          .select('*')
          .eq('game_id', game.id)
          .order('week_number', { ascending: true });

        if (weeksError) throw weeksError;

        // Fetch ticket sales for each week
        const weeksWithTicketSales = await Promise.all((weeksData || []).map(async (week) => {
          const { data: ticketSalesData, error: ticketSalesError } = await supabase
            .from('ticket_sales')
            .select('*')
            .eq('week_id', week.id)
            .order('date', { ascending: true });

          if (ticketSalesError) throw ticketSalesError;

          // Calculate week totals
          const weeklyTicketsSold = (ticketSalesData || []).reduce((sum, sale) => sum + sale.tickets_sold, 0);
          const weeklySales = (ticketSalesData || []).reduce((sum, sale) => sum + sale.amount_collected, 0);

          return {
            ...week,
            ticket_sales: ticketSalesData || [],
            weekly_tickets_sold: weeklyTicketsSold,
            weekly_sales: weeklySales
          };
        }));

        // Fetch expenses for the game
        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select('*')
          .eq('game_id', game.id)
          .order('date', { ascending: true });

        if (expensesError) throw expensesError;

        // Calculate game totals
        const totalTicketsSold = weeksWithTicketSales.reduce((sum, week) => sum + week.weekly_tickets_sold, 0);
        const totalSales = weeksWithTicketSales.reduce((sum, week) => sum + week.weekly_sales, 0);
        const totalExpenses = (expensesData || []).reduce((sum, expense) => sum + expense.amount, 0);
        const organizationNetProfit = (totalSales * (game.organization_percentage / 100)) - totalExpenses;

        // Update game with calculated totals
        const { error: updateError } = await supabase
          .from('games')
          .update({
            total_tickets_sold: totalTicketsSold,
            total_sales: totalSales,
            total_expenses: totalExpenses,
            organization_net_profit: organizationNetProfit
          })
          .eq('id', game.id);

        if (updateError) throw updateError;

        return {
          ...game,
          weeks: weeksWithTicketSales,
          expenses: expensesData || [],
          total_tickets_sold: totalTicketsSold,
          total_sales: totalSales,
          total_expenses: totalExpenses,
          organization_net_profit: organizationNetProfit
        };
      }));

      setGames(gamesWithWeeks);
      
      // Set current game to the first one if none is selected
      if (!currentGameId && gamesWithWeeks.length > 0) {
        setCurrentGameId(gamesWithWeeks[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching games:', error);
      toast({
        title: "Error",
        description: `Failed to fetch games: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createGame = async () => {
    try {
      setIsSubmitting(true);
      
      // Determine which user ID to use for creating the game
      const targetUserId = adminMode && currentOrganization ? currentOrganization.id : user?.id;
      
      if (!targetUserId) {
        throw new Error("No user ID available");
      }

      const { data, error } = await supabase
        .from('games')
        .insert([{
          name: gameForm.name,
          ticket_price: gameForm.ticketPrice,
          organization_percentage: gameForm.organizationPercentage,
          jackpot_percentage: gameForm.jackpotPercentage,
          minimum_starting_jackpot: gameForm.minimumStartingJackpot,
          carryover_jackpot: gameForm.carryoverJackpot,
          user_id: targetUserId
        }])
        .select();

      if (error) throw error;

      toast({
        title: "Game Created",
        description: `${gameForm.name} has been created successfully.`
      });
      setGameFormOpen(false);
      setGameForm({
        name: '',
        ticketPrice: 5,
        organizationPercentage: 50,
        jackpotPercentage: 50,
        minimumStartingJackpot: 500,
        carryoverJackpot: 0
      });
      fetchGames();
    } catch (error: any) {
      console.error('Error creating game:', error);
      toast({
        title: "Error",
        description: `Failed to create game: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const createWeek = async () => {
    if (!currentGameId) return;
    try {
      // Calculate end date as 6 days after start date (7 days total) using timezone-neutral calculation
      const endDate = addDaysToDate(weekForm.startDate, 6);
      
      const { data, error } = await supabase
        .from('weeks')
        .insert([{
          game_id: currentGameId,
          week_number: weekForm.weekNumber,
          start_date: formatDateForDatabase(weekForm.startDate),
          end_date: formatDateForDatabase(endDate)
        }])
        .select();

      if (error) throw error;

      toast({
        title: "Week Created",
        description: `Week ${weekForm.weekNumber} has been created successfully.`
      });
      setWeekFormOpen(false);
      setWeekForm({ weekNumber: 1, startDate: new Date() });
    } catch (error: any) {
      console.error('Error creating week:', error);
      toast({
        title: "Error",
        description: `Failed to create week: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const updateDailyEntry = async (weekId: string, dayIndex: number, ticketsSold: number) => {
    if (!currentGameId) return;
    
    try {
      const game = games.find(g => g.id === currentGameId);
      if (!game) throw new Error("Game not found");
      
      const week = game.weeks.find((w: any) => w.id === weekId);
      if (!week) throw new Error("Week not found");

      // Calculate the date for this day using timezone-neutral method
      const entryDate = getWeekDayDate(week.start_date, dayIndex);

      // Find existing entry for this specific date using timezone-neutral comparison
      const existingEntry = week.ticket_sales.find((entry: any) => {
        const existingDate = new Date(entry.date + 'T00:00:00'); // Ensure local timezone
        return isSameDay(existingDate, entryDate);
      });

      // Calculate the basic values
      const ticketPrice = game.ticket_price;
      const amountCollected = ticketsSold * ticketPrice;
      const organizationPercentage = game.organization_percentage;
      const jackpotPercentage = game.jackpot_percentage;
      const organizationTotal = amountCollected * (organizationPercentage / 100);
      const jackpotTotal = amountCollected * (jackpotPercentage / 100);

      // Get all ticket sales for this game to calculate cumulative correctly
      const { data: allGameSales, error: salesError } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('game_id', currentGameId)
        .order('date', { ascending: true });

      if (salesError) throw salesError;

      // Calculate cumulative collected up to this date (excluding current entry if updating)
      let cumulativeCollected = game.carryover_jackpot || 0;
      if (allGameSales) {
        for (const sale of allGameSales) {
          const saleDate = new Date(sale.date + 'T00:00:00'); // Ensure local timezone
          const currentEntryDate = entryDate;

          // Include all sales before this date, and this date if it's not the current entry being updated
          if (saleDate < currentEntryDate || (isSameDay(saleDate, currentEntryDate) && sale.id !== existingEntry?.id)) {
            cumulativeCollected += sale.amount_collected;
          }
        }
      }
      cumulativeCollected += amountCollected;

      // Calculate ending jackpot total
      let previousJackpotTotal = game.carryover_jackpot || 0;
      if (allGameSales && allGameSales.length > 0) {
        const previousEntries = allGameSales.filter(sale => {
          const saleDate = new Date(sale.date + 'T00:00:00'); // Ensure local timezone
          const currentEntryDate = entryDate;
          return saleDate < currentEntryDate || (isSameDay(saleDate, currentEntryDate) && sale.id !== existingEntry?.id);
        });
        
        if (previousEntries.length > 0) {
          const lastEntry = previousEntries[previousEntries.length - 1];
          previousJackpotTotal = lastEntry.ending_jackpot_total;
        }
      }
      const endingJackpotTotal = previousJackpotTotal + jackpotTotal;

      // Optimistically update local state first
      setGames(prevGames => prevGames.map(g => {
        if (g.id !== currentGameId) return g;
        return {
          ...g,
          weeks: g.weeks.map((w: any) => {
            if (w.id !== weekId) return w;
            const updatedTicketSales = existingEntry ? 
              w.ticket_sales.map((entry: any) => {
                const entryDateCheck = new Date(entry.date + 'T00:00:00'); // Ensure local timezone
                if (isSameDay(entryDateCheck, entryDate)) {
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
              }) : 
              [...w.ticket_sales, {
                id: `temp-${Date.now()}`,
                game_id: currentGameId,
                week_id: weekId,
                date: formatDateForDatabase(entryDate),
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
      }));

      if (existingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('ticket_sales')
          .update({
            date: formatDateForDatabase(entryDate),
            tickets_sold: ticketsSold,
            ticket_price: ticketPrice,
            amount_collected: amountCollected,
            cumulative_collected: cumulativeCollected,
            organization_total: organizationTotal,
            jackpot_total: jackpotTotal,
            ending_jackpot_total: endingJackpotTotal
          })
          .eq('id', existingEntry.id);
        
        if (error) throw error;
      } else {
        // Insert new entry
        const { error } = await supabase
          .from('ticket_sales')
          .insert([{
            game_id: currentGameId,
            week_id: weekId,
            date: formatDateForDatabase(entryDate),
            tickets_sold: ticketsSold,
            ticket_price: ticketPrice,
            amount_collected: amountCollected,
            cumulative_collected: cumulativeCollected,
            organization_total: organizationTotal,
            jackpot_total: jackpotTotal,
            ending_jackpot_total: endingJackpotTotal
          }]);
        
        if (error) throw error;
      }

      // Recalculate and update week totals
      const { data: updatedTicketSales, error: fetchError } = await supabase
        .from('ticket_sales')
        .select('*')
        .eq('week_id', weekId);
      
      if (fetchError) throw fetchError;
      
      const weekTotalTickets = updatedTicketSales?.reduce((sum, entry) => sum + entry.tickets_sold, 0) || 0;
      const weekTotalSales = updatedTicketSales?.reduce((sum, entry) => sum + entry.amount_collected, 0) || 0;
      
      const { error: weekUpdateError } = await supabase
        .from('weeks')
        .update({
          weekly_tickets_sold: weekTotalTickets,
          weekly_sales: weekTotalSales
        })
        .eq('id', weekId);
      
      if (weekUpdateError) throw weekUpdateError;

      // Recalculate and update game totals
      const { data: allWeeks, error: weeksError } = await supabase
        .from('weeks')
        .select('weekly_tickets_sold, weekly_sales')
        .eq('game_id', currentGameId);
      
      if (weeksError) throw weeksError;
      
      const gameTotalTickets = allWeeks?.reduce((sum, week) => sum + (week.weekly_tickets_sold || 0), 0) || 0;
      const gameTotalSales = allWeeks?.reduce((sum, week) => sum + (week.weekly_sales || 0), 0) || 0;
      
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('game_id', currentGameId);
      
      if (expensesError) throw expensesError;
      
      const totalExpenses = expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
      const organizationNetProfit = (gameTotalSales * (game.organization_percentage / 100)) - totalExpenses;
      
      const { error: gameUpdateError } = await supabase
        .from('games')
        .update({
          total_tickets_sold: gameTotalTickets,
          total_sales: gameTotalSales,
          total_expenses: totalExpenses,
          organization_net_profit: organizationNetProfit
        })
        .eq('id', currentGameId);
      
      if (gameUpdateError) throw gameUpdateError;

      toast({
        title: "Entry Updated",
        description: `Daily entry has been updated successfully.`
      });

      // Clear the temp input
      setTempTicketInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[`${weekId}-${dayIndex}`];
        return newInputs;
      });

    } catch (error: any) {
      console.error('Error updating daily entry:', error);
      // Revert optimistic update on error
      fetchGames();
      toast({
        title: "Error",
        description: `Failed to update daily entry: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleDailyDonation = async (date: string, amount: number) => {
    if (!currentGameId) return;
    
    try {
      const game = games.find(g => g.id === currentGameId);
      if (!game) throw new Error("Game not found");
      
      // Create an expense with negative amount (donation)
      const { error } = await supabase
        .from('expenses')
        .insert([{
          game_id: currentGameId,
          date: date,
          description: 'Donation',
          amount: -amount, // Negative amount for donation
          user_id: user?.id
        }]);
      
      if (error) throw error;
      
      toast({
        title: "Donation Added",
        description: `Donation of ${formatCurrency(amount)} has been added successfully.`
      });
      
      fetchGames();
    } catch (error: any) {
      console.error('Error adding donation:', error);
      toast({
        title: "Error",
        description: `Failed to add donation: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const openDailyExpenseModal = (date: string, gameId: string) => {
    setDailyExpenseDate(date);
    setDailyExpenseGameId(gameId);
    setDailyExpenseModalOpen(true);
  };

  const handleExpenseSubmit = async (expenseData: any) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .insert([{
          ...expenseData,
          game_id: dailyExpenseGameId,
          date: dailyExpenseDate,
          user_id: user?.id
        }]);
      
      if (error) throw error;
      
      toast({
        title: "Expense Added",
        description: `Expense of ${formatCurrency(expenseData.amount)} has been added successfully.`
      });
      
      setDailyExpenseModalOpen(false);
      fetchGames();
    } catch (error: any) {
      console.error('Error adding expense:', error);
      toast({
        title: "Error",
        description: `Failed to add expense: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const toggleWeekExpansion = (weekId: string) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [weekId]: !prev[weekId]
    }));
  };

  const handleTicketInputChange = (weekId: string, dayIndex: number, value: string) => {
    if (value === '' || /^\d+$/.test(value)) {
      setTempTicketInputs(prev => ({
        ...prev,
        [`${weekId}-${dayIndex}`]: value
      }));
    }
  };

  const handleTicketInputSubmit = (weekId: string, dayIndex: number) => {
    const inputKey = `${weekId}-${dayIndex}`;
    const value = tempTicketInputs[inputKey];
    
    if (value && parseInt(value) >= 0) {
      updateDailyEntry(weekId, dayIndex, parseInt(value));
    }
  };

  const openTicketSalesForm = (weekId: string) => {
    setSelectedWeekId(weekId);
    setTicketSalesOpen(true);
  };

  const handleTicketSalesSuccess = () => {
    setTicketSalesOpen(false);
    fetchGames();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  const getDayName = (dateString: string, dayIndex: number) => {
    try {
      const date = parseISO(dateString);
      const dayDate = addDays(date, dayIndex);
      return format(dayDate, 'EEE, MMM d');
    } catch (error) {
      console.error('Error getting day name:', error);
      return `Day ${dayIndex + 1}`;
    }
  };

  const currentGame = games.find(game => game.id === currentGameId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {adminMode && currentOrganization && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                {currentOrganization.logo_url ? (
                  <AvatarImage src={currentOrganization.logo_url} alt="Organization logo" />
                ) : null}
                <AvatarFallback className="bg-blue-100 text-blue-800">
                  {currentOrganization.organization_name?.charAt(0) || currentOrganization.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium text-blue-800">
                  {currentOrganization.organization_name || 'Unnamed Organization'}
                </h3>
                <p className="text-sm text-blue-600">{currentOrganization.email}</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Admin Mode
            </Badge>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button onClick={() => setGameFormOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Game
        </Button>
      </div>

      {games.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-gray-100 p-3 mb-4">
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-700 mb-2">No Games Yet</h3>
            <p className="text-gray-500 text-center mb-6 max-w-md">
              Create your first game to start tracking ticket sales, expenses, and profits.
            </p>
            <Button onClick={() => setGameFormOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create First Game
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Games</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {games.map(game => (
                    <div 
                      key={game.id}
                      className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${currentGameId === game.id ? 'bg-gray-50' : ''}`}
                      onClick={() => setCurrentGameId(game.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{game.name}</h3>
                          <p className="text-sm text-gray-500">
                            {game.weeks.length} {game.weeks.length === 1 ? 'week' : 'weeks'} • 
                            {formatCurrency(game.total_sales || 0)} total sales
                          </p>
                        </div>
                        {currentGameId === game.id && (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {currentGame && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Game Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Game Settings</h3>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="text-sm">
                          <p className="text-gray-500">Ticket Price</p>
                          <p className="font-medium">{formatCurrency(currentGame.ticket_price)}</p>
                        </div>
                        <div className="text-sm">
                          <p className="text-gray-500">Organization %</p>
                          <p className="font-medium">{currentGame.organization_percentage}%</p>
                        </div>
                        <div className="text-sm">
                          <p className="text-gray-500">Jackpot %</p>
                          <p className="font-medium">{currentGame.jackpot_percentage}%</p>
                        </div>
                        <div className="text-sm">
                          <p className="text-gray-500">Min. Jackpot</p>
                          <p className="font-medium">{formatCurrency(currentGame.minimum_starting_jackpot)}</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Game Totals</h3>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="text-sm">
                          <p className="text-gray-500">Tickets Sold</p>
                          <p className="font-medium">{currentGame.total_tickets_sold || 0}</p>
                        </div>
                        <div className="text-sm">
                          <p className="text-gray-500">Total Sales</p>
                          <p className="font-medium">{formatCurrency(currentGame.total_sales || 0)}</p>
                        </div>
                        <div className="text-sm">
                          <p className="text-gray-500">Total Expenses</p>
                          <p className="font-medium">{formatCurrency(currentGame.total_expenses || 0)}</p>
                        </div>
                        <div className="text-sm">
                          <p className="text-gray-500">Net Profit</p>
                          <p className="font-medium text-green-600">{formatCurrency(currentGame.organization_net_profit || 0)}</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate(`/games/${currentGame.id}`)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Game Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="md:col-span-2 space-y-6">
            {currentGame ? (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">{currentGame.name}</h2>
                  <Button onClick={() => setWeekFormOpen(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Week
                  </Button>
                </div>

                {currentGame.weeks.length === 0 ? (
                  <Card className="border-dashed border-2 border-gray-300">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="rounded-full bg-gray-100 p-3 mb-4">
                        <Calendar className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-medium text-gray-700 mb-2">No Weeks Yet</h3>
                      <p className="text-gray-500 text-center mb-6 max-w-md">
                        Add your first week to start tracking daily ticket sales.
                      </p>
                      <Button onClick={() => setWeekFormOpen(true)}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add First Week
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {currentGame.weeks.map((week: any) => (
                      <Card key={week.id} className="overflow-hidden">
                        <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleWeekExpansion(week.id)}>
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">
                              Week {week.week_number} ({formatDate(week.start_date)} - {formatDate(week.end_date)})
                            </CardTitle>
                            <div className="flex items-center space-x-4">
                              <div className="text-sm text-right">
                                <p className="text-gray-500">Sales</p>
                                <p className="font-medium">{formatCurrency(week.weekly_sales || 0)}</p>
                              </div>
                              <Button variant="ghost" size="sm">
                                {expandedWeeks[week.id] ? (
                                  <ChevronUp className="h-5 w-5" />
                                ) : (
                                  <ChevronDown className="h-5 w-5" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        
                        {expandedWeeks[week.id] && (
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <h3 className="text-sm font-medium">Daily Entries</h3>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => openTicketSalesForm(week.id)}
                                >
                                  <PlusCircle className="h-4 w-4 mr-2" />
                                  Add Ticket Sales
                                </Button>
                              </div>
                              
                              <div className="space-y-3">
                                {Array.from({ length: 7 }, (_, dayIndex) => {
                                  // Use timezone-neutral date calculation
                                  const entryDate = getWeekDayDate(week.start_date, dayIndex);

                                  // Find existing entry for this specific date using timezone-neutral comparison
                                  const existingEntry = week.ticket_sales.find((entry: any) => {
                                    const existingDate = new Date(entry.date + 'T00:00:00'); // Ensure local timezone
                                    return isSameDay(existingDate, entryDate);
                                  });

                                  const inputKey = `${week.id}-${dayIndex}`;
                                  const tempValue = tempTicketInputs[inputKey];
                                  const currentValue = tempValue !== undefined ? tempValue : existingEntry?.tickets_sold || '';

                                  return (
                                    <div key={dayIndex} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                                      <div className="w-32">
                                        <p className="font-medium">{getDayName(week.start_date, dayIndex)}</p>
                                      </div>
                                      
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <Input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="0"
                                            value={currentValue}
                                            onChange={(e) => handleTicketInputChange(week.id, dayIndex, e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                handleTicketInputSubmit(week.id, dayIndex);
                                              }
                                            }}
                                            className="w-24"
                                          />
                                          <span className="text-sm text-gray-500">tickets</span>
                                          
                                          <Button 
                                            size="sm" 
                                            variant="ghost"
                                            onClick={() => handleTicketInputSubmit(week.id, dayIndex)}
                                            disabled={tempValue === undefined || tempValue === ''}
                                          >
                                            <Save className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                      
                                      <div className="flex flex-col gap-1">
                                        <label className="text-xs font-medium text-gray-600">Quick Add</label>
                                        <Select onValueChange={value => {
                                          if (value === 'donation') {
                                            const amount = prompt('Enter donation amount:');
                                            if (amount && !isNaN(parseFloat(amount))) {
                                              handleDailyDonation(formatDateForDatabase(entryDate), parseFloat(amount));
                                            }
                                          } else if (value === 'expense') {
                                            openDailyExpenseModal(formatDateForDatabase(entryDate), game.id);
                                          }
                                        }}>
                                          <SelectTrigger className="w-32">
                                            <SelectValue placeholder="Actions" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="donation">Add Donation</SelectItem>
                                            <SelectItem value="expense">Add Expense</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      
                                      {existingEntry && (
                                        <div className="text-right">
                                          <p className="text-sm text-gray-500">Sales</p>
                                          <p className="font-medium">{formatCurrency(existingEntry.amount_collected)}</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {week.ticket_sales.length > 0 && (
                                <div className="pt-4">
                                  <h3 className="text-sm font-medium mb-2">Week Summary</h3>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                      <p className="text-sm text-gray-500">Total Tickets Sold</p>
                                      <p className="text-xl font-semibold">{week.weekly_tickets_sold || 0}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                      <p className="text-sm text-gray-500">Total Sales</p>
                                      <p className="text-xl font-semibold">{formatCurrency(week.weekly_sales || 0)}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <h3 className="text-xl font-medium text-gray-700 mb-2">Select a Game</h3>
                  <p className="text-gray-500 text-center">
                    Choose a game from the sidebar to view its details.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Create Game Dialog */}
      <Dialog open={gameFormOpen} onOpenChange={setGameFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Game</DialogTitle>
            <DialogDescription>
              Set up a new game with its ticket price and profit distribution.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Game Name</Label>
              <Input
                id="name"
                value={gameForm.name}
                onChange={(e) => setGameForm({ ...gameForm, name: e.target.value })}
                placeholder="Summer 50/50 Raffle"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticketPrice">Ticket Price ($)</Label>
              <Input
                id="ticketPrice"
                type="number"
                min="0.01"
                step="0.01"
                value={gameForm.ticketPrice}
                onChange={(e) => setGameForm({ ...gameForm, ticketPrice: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="organizationPercentage">Organization %</Label>
                <Input
                  id="organizationPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={gameForm.organizationPercentage}
                  onChange={(e) => {
                    const orgPct = parseInt(e.target.value) || 0;
                    setGameForm({
                      ...gameForm,
                      organizationPercentage: orgPct,
                      jackpotPercentage: 100 - orgPct
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jackpotPercentage">Jackpot %</Label>
                <Input
                  id="jackpotPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={gameForm.jackpotPercentage}
                  onChange={(e) => {
                    const jackpotPct = parseInt(e.target.value) || 0;
                    setGameForm({
                      ...gameForm,
                      jackpotPercentage: jackpotPct,
                      organizationPercentage: 100 - jackpotPct
                    });
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minimumStartingJackpot">Minimum Starting Jackpot ($)</Label>
              <Input
                id="minimumStartingJackpot"
                type="number"
                min="0"
                step="0.01"
                value={gameForm.minimumStartingJackpot}
                onChange={(e) => setGameForm({ ...gameForm, minimumStartingJackpot: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carryoverJackpot">Carryover Jackpot ($)</Label>
              <Input
                id="carryoverJackpot"
                type="number"
                min="0"
                step="0.01"
                value={gameForm.carryoverJackpot}
                onChange={(e) => setGameForm({ ...gameForm, carryoverJackpot: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGameFormOpen(false)}>Cancel</Button>
            <Button onClick={createGame} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Game'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Week Dialog */}
      <Dialog open={weekFormOpen} onOpenChange={setWeekFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Week</DialogTitle>
            <DialogDescription>
              Add a new week to track daily ticket sales.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="weekNumber">Week Number</Label>
              <Input
                id="weekNumber"
                type="number"
                min="1"
                value={weekForm.weekNumber}
                onChange={(e) => setWeekForm({ ...weekForm, weekNumber: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <DatePickerWithInput
                date={weekForm.startDate}
                setDate={(date) => setWeekForm({ ...weekForm, startDate: date || new Date() })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWeekFormOpen(false)}>Cancel</Button>
            <Button onClick={createWeek}>Create Week</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily Expense Dialog */}
      <Dialog open={dailyExpenseModalOpen} onOpenChange={setDailyExpenseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Record an expense for {dailyExpenseDate ? formatDate(dailyExpenseDate) : 'this day'}.
            </DialogDescription>
          </DialogHeader>
          <ExpenseForm onSubmit={handleExpenseSubmit} onCancel={() => setDailyExpenseModalOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Ticket Sales Dialog */}
      {ticketSalesOpen && currentGame && selectedWeekId && (
        <Dialog open={ticketSalesOpen} onOpenChange={setTicketSalesOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Ticket Sales</DialogTitle>
              <DialogDescription>
                Record ticket sales for this week.
              </DialogDescription>
            </DialogHeader>
            <TicketSalesRow
              gameId={currentGame.id}
              weekId={selectedWeekId}
              gameData={{
                ticket_price: currentGame.ticket_price,
                organization_percentage: currentGame.organization_percentage,
                jackpot_percentage: currentGame.jackpot_percentage,
                minimum_starting_jackpot: currentGame.minimum_starting_jackpot,
                carryover_jackpot: currentGame.carryover_jackpot
              }}
              previousEndingJackpot={0} // This would need to be calculated
              previousJackpotContributions={0} // This would need to be calculated
              onSuccess={handleTicketSalesSuccess}
              onCancel={() => setTicketSalesOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
