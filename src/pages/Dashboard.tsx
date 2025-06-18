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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const {
        data: gamesData,
        error: gamesError
      } = await supabase.from('games').select('*').eq('user_id', user.id).order('game_number', {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
        end_date: format(endDate, 'yyyy-MM-dd'),
        user_id: user.id
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
          ending_jackpot_total: endingJackpotTotal,
          user_id: user.id
        }]);
        if (error) throw error;
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
      
      <div className="grid gap-4">
        {displayGames.map(game => (
          <Card key={game.id}>
            <CardHeader>
              <CardTitle>{game.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {game.weeks.map(week => (
                    <TableRow key={week.id}>
                      <TableCell>{week.week_number}</TableCell>
                      <TableCell>{format(new Date(week.start_date), 'MM/dd/yyyy')}</TableCell>
                      <TableCell>{format(new Date(week.end_date), 'MM/dd/yyyy')}</TableCell>
                      <TableCell>
                        <Button onClick={() => { setCurrentWeekId(week.id); setExpandedWeek(expandedWeek === week.id ? null : week.id); }}>
                          {expandedWeek === week.id ? <ChevronUp /> : <ChevronDown />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Game Form */}
      <GameForm open={gameFormOpen} onOpenChange={setGameFormOpen} games={games} onComplete={fetchGames} />
      
      {/* Expense Modal */}
      <ExpenseModal open={expenseModalOpen} onOpenChange={setExpenseModalOpen} gameId={currentGameId || ''} gameName={currentGameName} />
      
      {/* Payout Slip Modal */}
      <PayoutSlipModal open={payoutSlipOpen} onOpenChange={setPayoutSlipOpen} winnerData={payoutSlipData} />
      
      {/* Winner Form */}
      <WinnerForm open={winnerFormOpen} onOpenChange={setWinnerFormOpen} gameId={currentGameId} weekId={currentWeekId} onComplete={fetchGames} onOpenPayoutSlip={() => {}} />
    </div>;
}
