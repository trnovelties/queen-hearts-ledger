
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { CalendarIcon, ChevronDown, ChevronUp, Download, Plus, Trash2 } from "lucide-react";
import { DatePickerWithInput } from "@/components/ui/datepicker";
import { ExpenseModal } from "@/components/ExpenseModal";
import { PayoutSlipModal } from "@/components/PayoutSlipModal";
import { WinnerForm } from "@/components/WinnerForm";
import { GameForm } from "@/components/GameForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import jsPDF from "jspdf";

export default function Dashboard() {
  const [games, setGames] = useState<any[]>([]);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const [expandedExpenses, setExpandedExpenses] = useState<string | null>(null);
  const [gameFormOpen, setGameFormOpen] = useState(false);
  const [weekFormOpen, setWeekFormOpen] = useState(false);
  const [rowFormOpen, setRowFormOpen] = useState(false);
  const [winnerFormOpen, setWinnerFormOpen] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [currentWeekId, setCurrentWeekId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekForm, setWeekForm] = useState({
    weekNumber: 1,
    startDate: new Date()
  });
  const [rowForm, setRowForm] = useState({
    date: new Date(),
    ticketsSold: 0
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<"game" | "week" | "entry" | "expense">('game');
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [payoutSlipOpen, setPayoutSlipOpen] = useState(false);
  const [payoutSlipData, setPayoutSlipData] = useState<any>(null);
  const {
    toast
  } = useToast();
  const [currentGameName, setCurrentGameName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'current' | 'archived'>('current');
  const [tempTicketInputs, setTempTicketInputs] = useState<{
    [key: string]: string;
  }>({});

  // New state for daily expense/donation functionality
  const [dailyExpenseModalOpen, setDailyExpenseModalOpen] = useState(false);
  const [dailyExpenseForm, setDailyExpenseForm] = useState({
    date: '',
    amount: 0,
    memo: '',
    gameId: ''
  });

  useEffect(() => {
    fetchGames();

    // Set up real-time subscription for games table
    const gamesSubscription = supabase.channel('public:games').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'games'
    }, () => {
      console.log('Games changed, refreshing data');
      fetchGames();
    }).subscribe();

    // Set up real-time subscription for weeks table
    const weeksSubscription = supabase.channel('public:weeks').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'weeks'
    }, () => {
      console.log('Weeks changed, refreshing data');
      fetchGames();
    }).subscribe();

    // Set up real-time subscription for ticket_sales table
    const ticketSalesSubscription = supabase.channel('public:ticket_sales').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'ticket_sales'
    }, () => {
      console.log('Ticket sales changed, refreshing data');
      fetchGames();
    }).subscribe();

    // Set up real-time subscription for expenses table
    const expensesSubscription = supabase.channel('public:expenses').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'expenses'
    }, () => {
      console.log('Expenses changed, refreshing data');
      fetchGames();
    }).subscribe();
    return () => {
      supabase.removeChannel(gamesSubscription);
      supabase.removeChannel(weeksSubscription);
      supabase.removeChannel(ticketSalesSubscription);
      supabase.removeChannel(expensesSubscription);
    };
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const {
        data: gamesData,
        error: gamesError
      } = await supabase.from('games').select('*').order('game_number', {
        ascending: true
      });
      if (gamesError) throw gamesError;
      const gamesWithDetails = await Promise.all(gamesData.map(async game => {
        // Get weeks for this game
        const {
          data: weeksData,
          error: weeksError
        } = await supabase.from('weeks').select('*').eq('game_id', game.id).order('week_number', {
          ascending: true
        });
        if (weeksError) throw weeksError;

        // Get expenses for this game
        const {
          data: expensesData,
          error: expensesError
        } = await supabase.from('expenses').select('*').eq('game_id', game.id).order('date', {
          ascending: false
        });
        if (expensesError) throw expensesError;

        // Get detailed week data with ticket sales
        const weeksWithDetails = await Promise.all(weeksData.map(async week => {
          const {
            data: salesData,
            error: salesError
          } = await supabase.from('ticket_sales').select('*').eq('week_id', week.id).order('date', {
            ascending: true
          });
          if (salesError) throw salesError;
          return {
            ...week,
            ticket_sales: salesData || []
          };
        }));
        return {
          ...game,
          weeks: weeksWithDetails || [],
          expenses: expensesData || []
        };
      }));
      setGames(gamesWithDetails);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: `Failed to fetch data: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter games based on active tab
  const currentGames = games.filter(game => !game.end_date);
  const archivedGames = games.filter(game => game.end_date);
  const displayGames = activeTab === 'current' ? currentGames : archivedGames;

  const createWeek = async () => {
    if (!currentGameId) return;
    try {
      // Calculate end date as 6 days after start date (7 days total)
      const endDate = new Date(weekForm.startDate);
      endDate.setDate(endDate.getDate() + 6);
      const {
        data,
        error
      } = await supabase.from('weeks').insert([{
        game_id: currentGameId,
        week_number: weekForm.weekNumber,
        start_date: format(weekForm.startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd')
      }]).select();
      if (error) throw error;
      toast({
        title: "Week Created",
        description: `Week ${weekForm.weekNumber} has been created successfully.`
      });
      setWeekFormOpen(false);
      setWeekForm({
        weekNumber: 1,
        startDate: new Date()
      });
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

      // Get all ticket sales for this game to calculate cumulative correctly
      const {
        data: allGameSales,
        error: salesError
      } = await supabase.from('ticket_sales').select('*').eq('game_id', currentGameId).order('date', {
        ascending: true
      });
      if (salesError) throw salesError;

      // Calculate cumulative collected up to this date (excluding current entry if updating)
      let cumulativeCollected = game.carryover_jackpot || 0;
      if (allGameSales) {
        for (const sale of allGameSales) {
          const saleDate = new Date(sale.date);
          const currentEntryDate = new Date(entryDate);

          // Include all sales before this date, and this date if it's not the current entry being updated
          if (saleDate < currentEntryDate || saleDate.toDateString() === currentEntryDate.toDateString() && sale.id !== existingEntry?.id) {
            cumulativeCollected += sale.amount_collected;
          }
        }
      }
      cumulativeCollected += amountCollected;

      // Calculate ending jackpot total
      // Get the previous ending jackpot total (from the most recent entry before this one)
      let previousJackpotTotal = game.carryover_jackpot || 0;
      if (allGameSales && allGameSales.length > 0) {
        // Find the most recent entry before this date
        const previousEntries = allGameSales.filter(sale => {
          const saleDate = new Date(sale.date);
          const currentEntryDate = new Date(entryDate);
          return saleDate < currentEntryDate || saleDate.toDateString() === currentEntryDate.toDateString() && sale.id !== existingEntry?.id;
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
            const updatedTicketSales = existingEntry ? w.ticket_sales.map((entry: any) => {
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
            }) : [...w.ticket_sales, {
              id: `temp-${Date.now()}`,
              game_id: currentGameId,
              week_id: weekId,
              date: format(entryDate, 'yyyy-MM-dd'),
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
        const {
          error
        } = await supabase.from('ticket_sales').update({
          date: format(entryDate, 'yyyy-MM-dd'),
          tickets_sold: ticketsSold,
          ticket_price: ticketPrice,
          amount_collected: amountCollected,
          cumulative_collected: cumulativeCollected,
          organization_total: organizationTotal,
          jackpot_total: jackpotTotal,
          ending_jackpot_total: endingJackpotTotal
        }).eq('id', existingEntry.id);
        if (error) throw error;
      } else {
        // Insert new entry
        const {
          error
        } = await supabase.from('ticket_sales').insert([{
          game_id: currentGameId,
          week_id: weekId,
          date: format(entryDate, 'yyyy-MM-dd'),
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
      const {
        data: weekSales
      } = await supabase.from('ticket_sales').select('*').eq('week_id', weekId);
      if (weekSales) {
        const weekTotalTickets = weekSales.reduce((sum: number, sale: any) => sum + sale.tickets_sold, 0);
        const weekTotalSales = weekSales.reduce((sum: number, sale: any) => sum + sale.amount_collected, 0);
        await supabase.from('weeks').update({
          weekly_sales: weekTotalSales,
          weekly_tickets_sold: weekTotalTickets
        }).eq('id', weekId);
      }

      // Recalculate and update game totals
      const {
        data: gameSales
      } = await supabase.from('ticket_sales').select('*').eq('game_id', currentGameId);
      if (gameSales) {
        const gameTotalSales = gameSales.reduce((sum: number, sale: any) => sum + sale.amount_collected, 0);
        const gameTotalOrganization = gameSales.reduce((sum: number, sale: any) => sum + sale.organization_total, 0);

        // Get total expenses and donations
        const {
          data: expenses
        } = await supabase.from('expenses').select('*').eq('game_id', currentGameId);
        const totalExpenses = expenses?.filter(e => !e.is_donation).reduce((sum: number, e: any) => sum + e.amount, 0) || 0;
        const totalDonations = expenses?.filter(e => e.is_donation).reduce((sum: number, e: any) => sum + e.amount, 0) || 0;
        const organizationNetProfit = gameTotalOrganization - totalExpenses - totalDonations;
        await supabase.from('games').update({
          total_sales: gameTotalSales,
          total_expenses: totalExpenses,
          total_donations: totalDonations,
          organization_net_profit: organizationNetProfit
        }).eq('id', currentGameId);
      }
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

  // Handle input change for ticket sold (store temporarily)
  const handleTicketInputChange = (weekId: string, dayIndex: number, value: string) => {
    const key = `${weekId}-${dayIndex}`;
    setTempTicketInputs(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle Enter key press to submit the ticket input
  const handleTicketInputSubmit = (weekId: string, dayIndex: number, value: string) => {
    const ticketsSold = parseInt(value) || 0;

    // Clear the temporary input immediately to show updated value
    const key = `${weekId}-${dayIndex}`;
    setTempTicketInputs(prev => {
      const newInputs = {
        ...prev
      };
      delete newInputs[key];
      return newInputs;
    });

    // Immediately update the local state to show the new value
    setGames(prevGames => prevGames.map(g => {
      if (g.id !== currentGameId) return g;
      return {
        ...g,
        weeks: g.weeks.map((w: any) => {
          if (w.id !== weekId) return w;
          const weekStartDate = new Date(w.start_date);
          const entryDate = new Date(weekStartDate);
          entryDate.setDate(entryDate.getDate() + dayIndex);
          const existingEntry = w.ticket_sales.find((entry: any) => {
            const existingDate = new Date(entry.date);
            return existingDate.toDateString() === entryDate.toDateString();
          });
          if (existingEntry) {
            return {
              ...w,
              ticket_sales: w.ticket_sales.map((entry: any) => {
                const entryDateCheck = new Date(entry.date);
                if (entryDateCheck.toDateString() === entryDate.toDateString()) {
                  return {
                    ...entry,
                    tickets_sold: ticketsSold
                  };
                }
                return entry;
              })
            };
          } else {
            // For new entries, we'll add a placeholder that will be updated by the database call
            return {
              ...w,
              ticket_sales: [...w.ticket_sales, {
                id: `temp-${Date.now()}`,
                game_id: currentGameId,
                week_id: weekId,
                date: format(entryDate, 'yyyy-MM-dd'),
                tickets_sold: ticketsSold,
                ticket_price: 0,
                amount_collected: 0,
                cumulative_collected: 0,
                organization_total: 0,
                jackpot_total: 0,
                ending_jackpot_total: 0
              }]
            };
          }
        })
      };
    }));

    // Then update the database
    updateDailyEntry(weekId, dayIndex, ticketsSold);
  };

  const toggleGame = (gameId: string) => {
    setExpandedGame(expandedGame === gameId ? null : gameId);
    setExpandedWeek(null);
    setExpandedExpenses(null);
  };

  const toggleWeek = (weekId: string) => {
    setExpandedWeek(expandedWeek === weekId ? null : weekId);
  };

  const toggleExpenses = (gameId: string) => {
    setExpandedExpenses(expandedExpenses === gameId ? null : gameId);
  };

  const openWeekForm = (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    // Find the last week number for this game
    const lastWeekNumber = game.weeks.length > 0 ? Math.max(...game.weeks.map((w: any) => w.week_number)) : 0;
    setWeekForm({
      weekNumber: lastWeekNumber + 1,
      startDate: new Date()
    });
    setCurrentGameId(gameId);
    setWeekFormOpen(true);
  };

  const openDeleteConfirm = (id: string, type: "game" | "week" | "entry" | "expense") => {
    setDeleteItemId(id);
    setDeleteType(type);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteItemId) {
      toast({
        title: "Error",
        description: "No item selected for deletion.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log(`Attempting to delete ${deleteType} with ID: ${deleteItemId}`);

      if (deleteType === 'game') {
        // Delete in proper order to avoid foreign key constraints
        
        // First, get all weeks for this game
        const { data: weeks, error: weeksError } = await supabase
          .from('weeks')
          .select('id')
          .eq('game_id', deleteItemId);
          
        if (weeksError) {
          console.error('Error fetching weeks:', weeksError);
          throw new Error(`Failed to fetch weeks: ${weeksError.message}`);
        }

        console.log(`Found ${weeks?.length || 0} weeks for game ${deleteItemId}`);

        // Delete ticket sales for all weeks in this game
        if (weeks && weeks.length > 0) {
          const weekIds = weeks.map(week => week.id);
          
          const { error: ticketSalesError } = await supabase
            .from('ticket_sales')
            .delete()
            .in('week_id', weekIds);

          if (ticketSalesError) {
            console.error('Error deleting ticket sales:', ticketSalesError);
            throw new Error(`Failed to delete ticket sales: ${ticketSalesError.message}`);
          }
          console.log('Successfully deleted ticket sales');
        }

        // Delete all weeks for this game
        const { error: deleteWeeksError } = await supabase
          .from('weeks')
          .delete()
          .eq('game_id', deleteItemId);

        if (deleteWeeksError) {
          console.error('Error deleting weeks:', deleteWeeksError);
          throw new Error(`Failed to delete weeks: ${deleteWeeksError.message}`);
        }
        console.log('Successfully deleted weeks');

        // Delete all expenses for this game
        const { error: expensesError } = await supabase
          .from('expenses')
          .delete()
          .eq('game_id', deleteItemId);

        if (expensesError) {
          console.error('Error deleting expenses:', expensesError);
          throw new Error(`Failed to delete expenses: ${expensesError.message}`);
        }
        console.log('Successfully deleted expenses');

        // Finally delete the game itself
        const { error: gameError } = await supabase
          .from('games')
          .delete()
          .eq('id', deleteItemId);

        if (gameError) {
          console.error('Error deleting game:', gameError);
          throw new Error(`Failed to delete game: ${gameError.message}`);
        }
        console.log('Successfully deleted game');

        // Close any expanded sections for this game
        if (expandedGame === deleteItemId) {
          setExpandedGame(null);
        }
        if (expandedExpenses === deleteItemId) {
          setExpandedExpenses(null);
        }

        toast({
          title: "Game Deleted",
          description: "Game and all associated data have been deleted successfully."
        });

      } else if (deleteType === 'week') {
        // First delete related entries in ticket_sales
        const { error: ticketSalesError } = await supabase
          .from('ticket_sales')
          .delete()
          .eq('week_id', deleteItemId);

        if (ticketSalesError) {
          throw new Error(`Failed to delete ticket sales: ${ticketSalesError.message}`);
        }

        // Then delete the week
        const { error: weekError } = await supabase
          .from('weeks')
          .delete()
          .eq('id', deleteItemId);

        if (weekError) {
          throw new Error(`Failed to delete week: ${weekError.message}`);
        }

        // Close expanded week if it's the one being deleted
        if (expandedWeek === deleteItemId) {
          setExpandedWeek(null);
        }

        toast({
          title: "Week Deleted",
          description: "Week and all associated entries have been deleted."
        });

      } else if (deleteType === 'entry') {
        // Get the entry details before deletion for recalculation
        const { data: entry, error: entryFetchError } = await supabase
          .from('ticket_sales')
          .select('*')
          .eq('id', deleteItemId)
          .single();

        if (entryFetchError) {
          throw new Error(`Failed to fetch entry: ${entryFetchError.message}`);
        }

        if (entry) {
          const { game_id, week_id, amount_collected, tickets_sold } = entry;

          // Delete the entry
          const { error } = await supabase
            .from('ticket_sales')
            .delete()
            .eq('id', deleteItemId);

          if (error) {
            throw new Error(`Failed to delete entry: ${error.message}`);
          }

          // Recalculate week totals
          const { data: remainingWeekSales } = await supabase
            .from('ticket_sales')
            .select('*')
            .eq('week_id', week_id);

          const weekTotalTickets = remainingWeekSales?.reduce((sum, sale) => sum + sale.tickets_sold, 0) || 0;
          const weekTotalSales = remainingWeekSales?.reduce((sum, sale) => sum + sale.amount_collected, 0) || 0;

          await supabase
            .from('weeks')
            .update({
              weekly_sales: weekTotalSales,
              weekly_tickets_sold: weekTotalTickets
            })
            .eq('id', week_id);

          // Recalculate game totals
          const { data: remainingGameSales } = await supabase
            .from('ticket_sales')
            .select('*')
            .eq('game_id', game_id);

          const gameTotalSales = remainingGameSales?.reduce((sum, sale) => sum + sale.amount_collected, 0) || 0;
          const gameTotalOrganization = remainingGameSales?.reduce((sum, sale) => sum + sale.organization_total, 0) || 0;

          // Get total expenses and donations
          const { data: expenses } = await supabase
            .from('expenses')
            .select('*')
            .eq('game_id', game_id);

          const totalExpenses = expenses?.filter(e => !e.is_donation).reduce((sum, e) => sum + e.amount, 0) || 0;
          const totalDonations = expenses?.filter(e => e.is_donation).reduce((sum, e) => sum + e.amount, 0) || 0;
          const organizationNetProfit = gameTotalOrganization - totalExpenses - totalDonations;

          await supabase
            .from('games')
            .update({
              total_sales: gameTotalSales,
              organization_net_profit: organizationNetProfit
            })
            .eq('id', game_id);

          toast({
            title: "Entry Deleted",
            description: "Daily entry has been deleted and totals updated."
          });
        }

      } else if (deleteType === 'expense') {
        // Get the expense details before deletion
        const { data: expense, error: expenseFetchError } = await supabase
          .from('expenses')
          .select('*')
          .eq('id', deleteItemId)
          .single();

        if (expenseFetchError) {
          throw new Error(`Failed to fetch expense: ${expenseFetchError.message}`);
        }

        if (expense) {
          const { game_id, amount, is_donation } = expense;

          // Delete the expense
          const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', deleteItemId);

          if (error) {
            throw new Error(`Failed to delete expense: ${error.message}`);
          }

          // Get the game and recalculate totals
          const { data: game } = await supabase
            .from('games')
            .select('*')
            .eq('id', game_id)
            .single();

          if (game) {
            const updatedValues = {
              total_expenses: is_donation ? game.total_expenses : game.total_expenses - amount,
              total_donations: is_donation ? game.total_donations - amount : game.total_donations,
              organization_net_profit: game.organization_net_profit + amount // Adding back since we're removing an expense/donation
            };

            await supabase
              .from('games')
              .update(updatedValues)
              .eq('id', game_id);
          }

          toast({
            title: is_donation ? "Donation Deleted" : "Expense Deleted",
            description: `The ${is_donation ? "donation" : "expense"} has been deleted and totals updated.`
          });
        }
      }

      // Force refresh data after any deletion
      console.log('Refreshing game data after deletion...');
      await fetchGames();

    } catch (error: any) {
      console.error('Error during deletion:', error);
      toast({
        title: "Delete Failed",
        description: error.message || `Failed to delete ${deleteType}: Unknown error`,
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteItemId(null);
    }
  };

  const openExpenseModal = (gameId: string, gameName: string) => {
    setCurrentGameId(gameId);
    setCurrentGameName(gameName);
    setExpenseModalOpen(true);
  };

  const handleOpenPayoutSlip = (winnerData: any) => {
    setPayoutSlipData(winnerData);
    setPayoutSlipOpen(true);
  };

  const handleWinnerComplete = () => {
    fetchGames();
  };

  const handleGameComplete = () => {
    fetchGames();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const generateGamePdfReport = async (game: any) => {
    try {
      toast({
        title: "Generating PDF",
        description: `Creating report for ${game.name}...`
      });

      // Create a new PDF document
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Add title and report information
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(`${game.name} - Detailed Report`, pageWidth / 2, yPosition, {
        align: 'center'
      });
      yPosition += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`Report Date: ${format(new Date(), 'MMM d, yyyy')}`, 20, yPosition);
      yPosition += 10;

      // Game details section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text('Game Information', 20, yPosition);
      yPosition += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Start Date: ${format(new Date(game.start_date), 'MMM d, yyyy')}`, 20, yPosition);
      yPosition += 7;
      if (game.end_date) {
        doc.text(`End Date: ${format(new Date(game.end_date), 'MMM d, yyyy')}`, 20, yPosition);
        yPosition += 7;
      }
      doc.text(`Ticket Price: ${formatCurrency(game.ticket_price)}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Organization Percentage: ${game.organization_percentage}%`, 20, yPosition);
      yPosition += 7;
      doc.text(`Jackpot Percentage: ${game.jackpot_percentage}%`, 20, yPosition);
      yPosition += 7;
      doc.text(`Carryover Jackpot: ${formatCurrency(game.carryover_jackpot)}`, 20, yPosition);
      yPosition += 15;

      // Summary section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text('Financial Summary', 20, yPosition);
      yPosition += 10;

      // Summary table
      const summaryData = [{
        label: 'Total Sales',
        value: formatCurrency(game.total_sales)
      }, {
        label: 'Total Payouts',
        value: formatCurrency(game.total_payouts)
      }, {
        label: 'Total Expenses',
        value: formatCurrency(game.total_expenses)
      }, {
        label: 'Total Donations',
        value: formatCurrency(game.total_donations)
      }, {
        label: 'Organization Net Profit',
        value: formatCurrency(game.organization_net_profit)
      }];
      const colWidth1 = 80;
      const colWidth2 = 60;
      const rowHeight = 8;
      doc.setFontSize(11);
      doc.text('Metric', 20, yPosition);
      doc.text('Value', 20 + colWidth1, yPosition);
      yPosition += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPosition, 20 + colWidth1 + colWidth2, yPosition);
      yPosition += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      summaryData.forEach(row => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(row.label, 20, yPosition);
        doc.text(row.value, 20 + colWidth1, yPosition);
        yPosition += rowHeight;
      });
      yPosition += 15;

      // Weeks section
      if (game.weeks && game.weeks.length > 0) {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text('Weekly Details', 20, yPosition);
        yPosition += 10;

        // Loop through each week
        for (let i = 0; i < game.weeks.length; i++) {
          const week = game.weeks[i];
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = 20;
          }
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.text(`Week ${week.week_number} (${format(new Date(week.start_date), 'MMM d')} - ${format(new Date(week.end_date), 'MMM d, yyyy')})`, 20, yPosition);
          yPosition += 8;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.text(`Tickets Sold: ${week.weekly_tickets_sold}`, 25, yPosition);
          yPosition += 6;
          doc.text(`Weekly Sales: ${formatCurrency(week.weekly_sales)}`, 25, yPosition);
          yPosition += 6;
          if (week.winner_name) {
            doc.text(`Winner: ${week.winner_name}`, 25, yPosition);
            yPosition += 6;
            doc.text(`Card Selected: ${week.card_selected || 'N/A'}`, 25, yPosition);
            yPosition += 6;
            doc.text(`Payout Amount: ${formatCurrency(week.weekly_payout)}`, 25, yPosition);
            yPosition += 6;
            doc.text(`Winner Present: ${week.winner_present ? 'Yes' : 'No'}`, 25, yPosition);
            yPosition += 6;
          }

          // If week has ticket sales entries, add a small table
          if (week.ticket_sales && week.ticket_sales.length > 0) {
            if (yPosition > pageHeight - 40) {
              doc.addPage();
              yPosition = 20;
            }
            doc.setFont("helvetica", "italic");
            doc.text("Daily Entries:", 25, yPosition);
            yPosition += 8;

            // Table headers
            doc.setFont("helvetica", "bold");
            let xPos = 25;
            const headers = ['Date', 'Tickets', 'Amount', 'Organization', 'Jackpot'];
            const colWidths = [25, 15, 25, 25, 25];
            headers.forEach((header, index) => {
              doc.text(header, xPos, yPosition);
              xPos += colWidths[index];
            });
            yPosition += 6;

            // Table rows
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            week.ticket_sales.forEach(entry => {
              if (yPosition > pageHeight - 15) {
                doc.addPage();
                yPosition = 20;

                // Redraw headers on new page
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                let xPos = 25;
                headers.forEach((header, index) => {
                  doc.text(header, xPos, yPosition);
                  xPos += colWidths[index];
                });
                yPosition += 6;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
              }
              xPos = 25;
              doc.text(format(new Date(entry.date), 'MM/dd/yyyy'), xPos, yPosition);
              xPos += colWidths[0];
              doc.text(entry.tickets_sold.toString(), xPos, yPosition);
              xPos += colWidths[1];
              doc.text(formatCurrency(entry.amount_collected), xPos, yPosition);
              xPos += colWidths[2];
              doc.text(formatCurrency(entry.organization_total), xPos, yPosition);
              xPos += colWidths[3];
              doc.text(formatCurrency(entry.jackpot_total), xPos, yPosition);
              yPosition += 6;
            });
            yPosition += 6;
          }
          yPosition += 10;
        }
      }

      // Expenses section
      if (game.expenses && game.expenses.length > 0) {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text('Expenses & Donations', 20, yPosition);
        yPosition += 10;
        const expenseHeaders = ['Date', 'Type', 'Amount', 'Memo'];
        const expenseColWidths = [25, 25, 25, 60];

        // Table headers
        doc.setFontSize(10);
        let xPos = 20;
        expenseHeaders.forEach((header, index) => {
          doc.text(header, xPos, yPosition);
          xPos += expenseColWidths[index];
        });
        yPosition += 5;

        // Draw a line
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yPosition, xPos - 60, yPosition);
        yPosition += 5;

        // Table rows
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        game.expenses.forEach(expense => {
          if (yPosition > pageHeight - 15) {
            doc.addPage();
            yPosition = 20;

            // Redraw headers on new page
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            let xPos = 20;
            expenseHeaders.forEach((header, index) => {
              doc.text(header, xPos, yPosition);
              xPos += expenseColWidths[index];
            });
            yPosition += 5;
            doc.line(20, yPosition, xPos - 60, yPosition);
            yPosition += 5;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
          }
          xPos = 20;
          doc.text(format(new Date(expense.date), 'MM/dd/yyyy'), xPos, yPosition);
          xPos += expenseColWidths[0];
          doc.text(expense.is_donation ? 'Donation' : 'Expense', xPos, yPosition);
          xPos += expenseColWidths[1];
          doc.text(formatCurrency(expense.amount), xPos, yPosition);
          xPos += expenseColWidths[2];

          // Truncate long memos
          const memo = expense.memo || '-';
          const truncatedMemo = memo.length > 30 ? memo.substring(0, 27) + '...' : memo;
          doc.text(truncatedMemo, xPos, yPosition);
          yPosition += 6;
        });
      }

      // Add footer
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.text(`Generated on ${format(new Date(), 'MMM d, yyyy h:mm a')}`, pageWidth - 20, pageHeight - 10, {
        align: 'right'
      });

      // Save the PDF
      const fileName = `${game.name.replace(/\s+/g, '-')}-report-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast({
        title: "Report Generated",
        description: `${game.name} report has been downloaded successfully.`
      });
    } catch (error: any) {
      console.error('Error generating game PDF:', error);
      toast({
        title: "Error",
        description: `Failed to generate report: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleDailyDonation = async (date: string, amount: number) => {
    if (!currentGameId || amount <= 0) return;
    try {
      const {
        error
      } = await supabase.from('expenses').insert([{
        game_id: currentGameId,
        date: date,
        amount: amount,
        memo: 'Daily donation',
        is_donation: true
      }]);
      if (error) throw error;

      // Update game totals
      const game = games.find(g => g.id === currentGameId);
      if (game) {
        await supabase.from('games').update({
          total_donations: game.total_donations + amount,
          organization_net_profit: game.organization_net_profit - amount
        }).eq('id', currentGameId);
      }
      toast({
        title: "Donation Added",
        description: `Daily donation of ${formatCurrency(amount)} has been recorded.`
      });
    } catch (error: any) {
      console.error('Error adding daily donation:', error);
      toast({
        title: "Error",
        description: `Failed to add donation: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleDailyExpense = async () => {
    if (!dailyExpenseForm.gameId || dailyExpenseForm.amount <= 0) return;
    try {
      const {
        error
      } = await supabase.from('expenses').insert([{
        game_id: dailyExpenseForm.gameId,
        date: dailyExpenseForm.date,
        amount: dailyExpenseForm.amount,
        memo: dailyExpenseForm.memo,
        is_donation: false
      }]);
      if (error) throw error;

      // Update game totals
      const game = games.find(g => g.id === dailyExpenseForm.gameId);
      if (game) {
        await supabase.from('games').update({
          total_expenses: game.total_expenses + dailyExpenseForm.amount,
          organization_net_profit: game.organization_net_profit - dailyExpenseForm.amount
        }).eq('id', dailyExpenseForm.gameId);
      }
      toast({
        title: "Expense Added",
        description: `Daily expense of ${formatCurrency(dailyExpenseForm.amount)} has been recorded.`
      });
      setDailyExpenseModalOpen(false);
      setDailyExpenseForm({
        date: '',
        amount: 0,
        memo: '',
        gameId: ''
      });
    } catch (error: any) {
      console.error('Error adding daily expense:', error);
      toast({
        title: "Error",
        description: `Failed to add expense: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const openDailyExpenseModal = (date: string, gameId: string) => {
    setDailyExpenseForm({
      date: date,
      amount: 0,
      memo: '',
      gameId: gameId
    });
    setDailyExpenseModalOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>;
  }

  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Queen of Hearts Games</h1>
        <Button onClick={() => setGameFormOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" /> Create Game
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <button onClick={() => setActiveTab('current')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'current' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          Current Game
        </button>
        <button onClick={() => setActiveTab('archived')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'archived' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          Archived Games
        </button>
      </div>
      
      <div className="space-y-4">
        {displayGames.length === 0 ? <Card>
            <CardContent className="p-6 flex justify-center items-center">
              <p className="text-muted-foreground">
                {activeTab === 'current' ? 'No current games. Click "Create Game" to get started.' : 'No archived games yet.'}
              </p>
            </CardContent>
          </Card> : displayGames.map(game => {
        // Calculate actual start and end dates from weeks data
        const gameStartDate = game.weeks.length > 0 ? game.weeks.reduce((earliest: any, week: any) => new Date(week.start_date) < new Date(earliest.start_date) ? week : earliest).start_date : game.start_date;
        const gameEndDate = game.weeks.length > 0 ? game.weeks.reduce((latest: any, week: any) => new Date(week.end_date) > new Date(latest.end_date) ? week : latest).end_date : game.end_date;
        return <Card key={game.id} className="overflow-hidden">
                <CardHeader className={`flex flex-col items-start justify-between cursor-pointer ${expandedGame === game.id ? 'bg-accent/50' : ''}`} onClick={() => toggleGame(game.id)}>
                  <div className="w-full flex flex-row items-center justify-between">
                    <CardTitle className="text-xl">
                      {game.name}
                      {game.end_date && <span className="ml-2 text-sm text-green-600 font-normal">(Completed)</span>}
                    </CardTitle>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm hidden md:flex space-x-4">
                        <div>
                          <span className="text-muted-foreground">Start:</span> {format(new Date(gameStartDate), 'MMM d, yyyy')}
                          {gameEndDate && <>
                              <span className="ml-4 text-muted-foreground">End:</span> {format(new Date(gameEndDate), 'MMM d, yyyy')}
                            </>}
                        </div>
                        <div><span className="text-muted-foreground">Total:</span> {formatCurrency(game.total_sales)}</div>
                        <div><span className="text-muted-foreground">Profit:</span> {formatCurrency(game.organization_net_profit)}</div>
                      </div>
                      
                      <Button onClick={e => {
                  e.stopPropagation();
                  openDeleteConfirm(game.id, 'game');
                }} variant="ghost" size="icon" className="text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                        <Trash2 className="h-5 w-5" />
                      </Button>
                      
                      <div className="flex items-center">
                        {expandedGame === game.id ? <ChevronUp className="h-6 w-6 text-muted-foreground" /> : <ChevronDown className="h-6 w-6 text-muted-foreground" />}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                {expandedGame === game.id && <CardContent className="p-0 border-t">
                    <div className="p-4 border-t">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Weeks</h3>
                        <div className="flex space-x-2">
                          <Button onClick={() => generateGamePdfReport(game)} variant="export" size="sm" className="flex items-center gap-2">
                            <Download className="h-4 w-4" /> Export Game PDF
                          </Button>
                          <Button onClick={() => openWeekForm(game.id)} size="sm" className="bg-[#A1E96C] hover:bg-[#A1E96C]/90 text-[#1F4E4A] flex items-center gap-2">
                            <Plus className="h-4 w-4" /> Add Week
                          </Button>
                        </div>
                      </div>
                      
                      {game.weeks.length === 0 ? <p className="text-muted-foreground text-sm">No weeks added yet.</p> : <div className="space-y-4">
                          {/* Week Calendar-style Layout */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-[5px]">
                            {game.weeks.map((week: any) => <div key={week.id} className="space-y-2">
                                {/* Week Button */}
                                <Button onClick={() => {
                      toggleWeek(week.id);
                      setCurrentGameId(game.id);
                    }} variant="outline" className={`w-full h-16 text-lg font-semibold transition-all duration-200 ${expandedWeek === week.id ? 'bg-[#4A7C59] border-[#4A7C59] text-white shadow-md' : 'bg-[#A1E96C] border-[#A1E96C] text-[#1F4E4A] hover:bg-[#A1E96C]/90'}`}>
                                  Week {week.week_number}
                                </Button>
                                
                                {/* Delete Button */}
                                
                              </div>)}
                          </div>
                          
                          {/* Expanded Week Details */}
                          {expandedWeek && game.weeks.find((w: any) => w.id === expandedWeek) && <div className="mt-6 bg-white border border-gray-200 rounded-lg shadow-lg p-6">
                              {(() => {
                    const week = game.weeks.find((w: any) => w.id === expandedWeek);

                    // Calculate week totals from daily entries
                    const weekTotalTickets = week.ticket_sales.reduce((sum: number, entry: any) => sum + entry.tickets_sold, 0);
                    const weekTotalSales = week.ticket_sales.reduce((sum: number, entry: any) => sum + entry.amount_collected, 0);
                    const weekOrganizationTotal = week.ticket_sales.reduce((sum: number, entry: any) => sum + entry.organization_total, 0);
                    const weekJackpotTotal = week.ticket_sales.reduce((sum: number, entry: any) => sum + entry.jackpot_total, 0);
                    return <div>
                                    {/* Week Details Header */}
                                    <div className="pb-6 border-b border-gray-200">
                                      <div className="flex justify-between items-start mb-4">
                                        <div>
                                          <h4 className="text-2xl font-bold text-[#1F4E4A] mb-2">Week {week.week_number}</h4>
                                          <p className="text-gray-600 text-lg">
                                            {format(new Date(week.start_date), 'MMMM d')} - {format(new Date(week.end_date), 'MMMM d, yyyy')}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button onClick={() => openDeleteConfirm(week.id, 'week')} variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                          <button onClick={() => setExpandedWeek(null)} className="text-gray-400 hover:text-gray-600 text-2xl font-light w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100">
                                            ×
                                          </button>
                                        </div>
                                      </div>
                                      
                                      {/* Week Summary Stats */}
                                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                                          <div className="text-2xl font-bold text-blue-700">{weekTotalTickets}</div>
                                          <div className="text-sm text-blue-600 font-medium">Tickets Sold</div>
                                        </div>
                                        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                                          <div className="text-2xl font-bold text-green-700">{formatCurrency(weekTotalSales)}</div>
                                          <div className="text-sm text-green-600 font-medium">Total Sales</div>
                                        </div>
                                        <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                                          <div className="text-2xl font-bold text-purple-700">{formatCurrency(weekOrganizationTotal)}</div>
                                          <div className="text-sm text-purple-600 font-medium">Organization Net</div>
                                        </div>
                                        <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                                          <div className="text-2xl font-bold text-orange-700">{formatCurrency(weekJackpotTotal)}</div>
                                          <div className="text-sm text-orange-600 font-medium">Jackpot Total</div>
                                        </div>
                                      </div>
                                      
                                      {/* Winner Information */}
                                      {week.winner_name && <div className="mt-6 p-6 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg">
                                          <h5 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
                                            🏆 Winner Information
                                          </h5>
                                          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                                            <div className="space-y-1">
                                              <div className="font-medium text-yellow-700">Winner Name</div>
                                              <div className="text-yellow-900 font-semibold">{week.winner_name}</div>
                                            </div>
                                            <div className="space-y-1">
                                              <div className="font-medium text-yellow-700">Slot Selected</div>
                                              <div className="text-yellow-900 font-semibold">#{week.slot_chosen}</div>
                                            </div>
                                            <div className="space-y-1">
                                              <div className="font-medium text-yellow-700">Card Drawn</div>
                                              <div className="text-yellow-900 font-semibold">{week.card_selected}</div>
                                            </div>
                                            <div className="space-y-1">
                                              <div className="font-medium text-yellow-700">Payout Amount</div>
                                              <div className="text-yellow-900 font-semibold">{formatCurrency(week.weekly_payout)}</div>
                                            </div>
                                            <div className="space-y-1">
                                              <div className="font-medium text-yellow-700">Winner Present</div>
                                              <div className={`font-semibold ${week.winner_present ? 'text-green-600' : 'text-red-600'}`}>
                                                {week.winner_present ? '✓ Yes' : '✗ No'}
                                              </div>
                                            </div>
                                          </div>
                                          
                                          <div className="mt-4 flex gap-3">
                                            <Button onClick={() => {
                              setCurrentWeekId(week.id);
                              setWinnerFormOpen(true);
                            }} size="sm" className="bg-[#A1E96C] hover:bg-[#A1E96C]/90 text-[#1F4E4A] border border-[#A1E96C]">
                                              Edit Winner Details
                                            </Button>
                                            <Button onClick={() => {
                              const winnerData = {
                                winnerName: week.winner_name,
                                slotChosen: week.slot_chosen,
                                cardSelected: week.card_selected,
                                payoutAmount: week.weekly_payout,
                                date: new Date().toISOString().split('T')[0],
                                gameNumber: game.game_number,
                                gameName: game.name,
                                weekNumber: week.week_number,
                                weekStartDate: week.start_date,
                                weekEndDate: week.end_date
                              };
                              handleOpenPayoutSlip(winnerData);
                            }} size="sm" className="bg-[#A1E96C] hover:bg-[#A1E96C]/90 text-[#1F4E4A] border border-[#A1E96C]">
                                              Print Payout Slip
                                            </Button>
                                          </div>
                                        </div>}
                                    </div>
                                    
                                    {/* 7 Daily Entries */}
                                    <div className="pt-6">
                                      <h5 className="text-lg font-semibold mb-4 text-[#1F4E4A]">Daily Entries (7 Days)</h5>
                                      
                                      <div className="space-y-3 h-fit">
                                        {Array.from({
                            length: 7
                          }, (_, dayIndex) => {
                            const weekStartDate = new Date(week.start_date);
                            const entryDate = new Date(weekStartDate);
                            entryDate.setDate(entryDate.getDate() + dayIndex);

                            // Find existing entry for this specific date
                            const existingEntry = week.ticket_sales.find((entry: any) => {
                              const existingDate = new Date(entry.date);
                              return existingDate.toDateString() === entryDate.toDateString();
                            });
                            const inputKey = `${week.id}-${dayIndex}`;
                            const tempValue = tempTicketInputs[inputKey];
                            const currentValue = tempValue !== undefined ? tempValue : existingEntry?.tickets_sold || '';
                            return <div key={dayIndex} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                                              <div className="min-w-0 flex-1">
                                                <div className="text-base font-semibold text-gray-900">
                                                  Day {dayIndex + 1}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                  {format(entryDate, 'EEEE, MMMM d, yyyy')}
                                                </div>
                                              </div>
                                              
                                              <div className="flex items-center gap-3">
                                                <div className="flex flex-col gap-1">
                                                  <label className="text-xs font-medium text-gray-600">Tickets Sold</label>
                                                  <Input type="number" min="0" value={currentValue} onChange={e => handleTicketInputChange(week.id, dayIndex, e.target.value)} onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      handleTicketInputSubmit(week.id, dayIndex, e.currentTarget.value);
                                    }
                                  }} onBlur={e => {
                                    // Submit on blur as well
                                    handleTicketInputSubmit(week.id, dayIndex, e.target.value);
                                  }} className="w-28 h-9 text-center font-medium" placeholder="0" />
                                                </div>
                                                
                                                <div className="flex flex-col gap-1">
                                                  <label className="text-xs font-medium text-gray-600">Quick Add</label>
                                                  <Select onValueChange={value => {
                                    if (value === 'donation') {
                                      const amount = prompt('Enter donation amount:');
                                      if (amount && !isNaN(parseFloat(amount))) {
                                        handleDailyDonation(format(entryDate, 'yyyy-MM-dd'), parseFloat(amount));
                                      }
                                    } else if (value === 'expense') {
                                      openDailyExpenseModal(format(entryDate, 'yyyy-MM-dd'), game.id);
                                    }
                                  }}>
                                                    <SelectTrigger className="w-24 h-9">
                                                      <SelectValue placeholder="+" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="donation">Donation</SelectItem>
                                                      <SelectItem value="expense">Expense</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                                
                                                {existingEntry && <div className="flex flex-col gap-1">
                                                    <label className="text-xs font-medium text-gray-600">Day Total</label>
                                                    <div className="text-sm font-bold px-3 py-2 bg-blue-100 text-blue-800 rounded border border-blue-200 min-w-[80px] text-center">
                                                      {formatCurrency(existingEntry.amount_collected)}
                                                    </div>
                                                  </div>}
                                              </div>
                                            </div>;
                          })}
                                      </div>
                                      
                                      {week.ticket_sales.length >= 7 && !week.winner_name && <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                          <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                              <p className="text-sm font-medium text-amber-800">Week is complete!</p>
                                              <p className="text-xs text-amber-700">Please enter winner details to finalize this week.</p>
                                            </div>
                                            <Button onClick={() => {
                              setCurrentWeekId(week.id);
                              setWinnerFormOpen(true);
                            }} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-medium">
                                              Enter Winner Details
                                            </Button>
                                          </div>
                                        </div>}
                                    </div>
                                  </div>;
                  })()}
                            </div>}
                        </div>}
                    </div>

                    {/* Expenses & Donations Section */}
                    <div className="p-4 border-t">
                      <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={() => toggleExpenses(game.id)}>
                        <h3 className="text-lg font-semibold flex items-center">
                          Expenses & Donations
                          <div className="ml-2">
                            {expandedExpenses === game.id ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                          </div>
                        </h3>
                        <Button onClick={e => {
                  e.stopPropagation();
                  openExpenseModal(game.id, game.name);
                }} size="sm" variant="outline" className="text-sm">
                          Add Expense/Donation
                        </Button>
                      </div>
                      
                      {expandedExpenses === game.id && <>
                          {game.expenses && game.expenses.length > 0 ? <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Memo</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {game.expenses.map((expense: any) => <TableRow key={expense.id}>
                                      <TableCell>{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                                      <TableCell>{formatCurrency(expense.amount)}</TableCell>
                                      <TableCell>{expense.is_donation ? 'Donation' : 'Expense'}</TableCell>
                                      <TableCell>{expense.memo}</TableCell>
                                      <TableCell className="text-right">
                                        <Button onClick={() => openDeleteConfirm(expense.id, 'expense')} variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>)}
                                </TableBody>
                              </Table>
                            </div> : <p className="text-muted-foreground text-sm">No expenses or donations recorded yet.</p>}
                        </>}
                    </div>
                  </CardContent>}
              </Card>;
      })}
      </div>
      
      {/* Week Form Dialog */}
      <Dialog open={weekFormOpen} onOpenChange={setWeekFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Week</DialogTitle>
            <DialogDescription>
              Enter the details for the new week. The end date will be automatically calculated as 7 days from the start date.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="weekNumber" className="text-sm font-medium">Week Number</label>
              <Input id="weekNumber" type="number" value={weekForm.weekNumber} onChange={e => setWeekForm({
              ...weekForm,
              weekNumber: parseInt(e.target.value)
            })} min="1" />
            </div>
            
            <div className="grid gap-2">
              <DatePickerWithInput label="Start Date" date={weekForm.startDate} setDate={date => date ? setWeekForm({
              ...weekForm,
              startDate: date
            }) : null} placeholder="Select start date" />
              <p className="text-xs text-muted-foreground">
                End date will be automatically set to {weekForm.startDate ? format(new Date(weekForm.startDate.getTime() + 6 * 24 * 60 * 60 * 1000), 'MMM d, yyyy') : 'N/A'}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setWeekFormOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button onClick={createWeek} type="submit" variant="default">
              Create Week
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {deleteType}? 
              {deleteType === 'game' && ' This will permanently delete the game and ALL associated weeks, ticket sales, and expenses.'}
              {deleteType === 'week' && ' This will permanently delete the week and ALL associated daily entries.'}
              {deleteType === 'entry' && ' This will permanently delete this daily entry.'}
              {deleteType === 'expense' && ' This will permanently delete this expense/donation.'}
              <br /><br />
              <strong>This action cannot be undone.</strong>
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button onClick={() => setDeleteDialogOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button onClick={confirmDelete} type="submit" variant="destructive">
              Delete {deleteType}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Expense Modal */}
      <ExpenseModal open={expenseModalOpen} onOpenChange={setExpenseModalOpen} gameId={currentGameId || ''} gameName={currentGameName} />
      
      {/* Payout Slip Modal */}
      <PayoutSlipModal open={payoutSlipOpen} onOpenChange={setPayoutSlipOpen} winnerData={payoutSlipData} />
      
      {/* Winner Form */}
      <WinnerForm open={winnerFormOpen} onOpenChange={setWinnerFormOpen} gameId={currentGameId} weekId={currentWeekId} onComplete={handleWinnerComplete} onOpenPayoutSlip={handleOpenPayoutSlip} />
      
      {/* Game Form */}
      <GameForm open={gameFormOpen} onOpenChange={setGameFormOpen} games={games} onComplete={handleGameComplete} />
      
      {/* Daily Expense Modal */}
      <Dialog open={dailyExpenseModalOpen} onOpenChange={setDailyExpenseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Daily Expense</DialogTitle>
            <DialogDescription>
              Enter the expense details for {dailyExpenseForm.date && format(new Date(dailyExpenseForm.date), 'MMM d, yyyy')}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" step="0.01" min="0" value={dailyExpenseForm.amount || ''} onChange={e => setDailyExpenseForm({
              ...dailyExpenseForm,
              amount: parseFloat(e.target.value) || 0
            })} placeholder="0.00" />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="memo">Memo</Label>
              <Textarea id="memo" value={dailyExpenseForm.memo} onChange={e => setDailyExpenseForm({
              ...dailyExpenseForm,
              memo: e.target.value
            })} placeholder="Enter expense description..." rows={3} />
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setDailyExpenseModalOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleDailyExpense} type="submit" variant="default" disabled={dailyExpenseForm.amount <= 0}>
              Add Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}
