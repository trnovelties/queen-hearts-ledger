import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { CalendarIcon, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { ExpenseModal } from "@/components/ExpenseModal";
import { PayoutSlipModal } from "@/components/PayoutSlipModal";
import { WinnerForm } from "@/components/WinnerForm";
import { GameForm } from "@/components/GameForm";

export default function Dashboard() {
  const [games, setGames] = useState<any[]>([]);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const [gameFormOpen, setGameFormOpen] = useState(false);
  const [weekFormOpen, setWeekFormOpen] = useState(false);
  const [rowFormOpen, setRowFormOpen] = useState(false);
  const [winnerFormOpen, setWinnerFormOpen] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [currentWeekId, setCurrentWeekId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekForm, setWeekForm] = useState({
    weekNumber: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setDate(new Date().getDate() + 6)).toISOString().split('T')[0]
  });
  const [rowForm, setRowForm] = useState({
    date: new Date().toISOString().split('T')[0],
    ticketsSold: 0
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<"game" | "week" | "entry" | "expense">('game');
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [payoutSlipOpen, setPayoutSlipOpen] = useState(false);
  const [payoutSlipData, setPayoutSlipData] = useState<any>(null);
  const { toast } = useToast();
  const [currentGameName, setCurrentGameName] = useState<string>("");

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

  const createWeek = async () => {
    if (!currentGameId) return;
    
    try {
      const {
        data,
        error
      } = await supabase.from('weeks').insert([{
        game_id: currentGameId,
        week_number: weekForm.weekNumber,
        start_date: weekForm.startDate,
        end_date: weekForm.endDate
      }]).select();
      
      if (error) throw error;
      
      toast({
        title: "Week Created",
        description: `Week ${weekForm.weekNumber} has been created successfully.`
      });
      
      setWeekFormOpen(false);
      setWeekForm({
        weekNumber: 1,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setDate(new Date().getDate() + 6)).toISOString().split('T')[0]
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

  const addRow = async () => {
    if (!currentGameId || !currentWeekId) return;
    
    try {
      const game = games.find(g => g.id === currentGameId);
      if (!game) throw new Error("Game not found");
      
      const week = game.weeks.find((w: any) => w.id === currentWeekId);
      if (!week) throw new Error("Week not found");

      // Calculate the values
      const ticketPrice = game.ticket_price;
      const amountCollected = rowForm.ticketsSold * ticketPrice;
      const organizationPercentage = game.organization_percentage;
      const jackpotPercentage = game.jackpot_percentage;
      const organizationTotal = amountCollected * (organizationPercentage / 100);
      const jackpotTotal = amountCollected * (jackpotPercentage / 100);

      // Get latest cumulative collected for this game
      const {
        data: latestSale,
        error: latestSaleError
      } = await supabase.from('ticket_sales').select('cumulative_collected, ending_jackpot_total').eq('game_id', currentGameId).order('created_at', {
        ascending: false
      }).limit(1);
      
      if (latestSaleError) throw latestSaleError;
      
      const previousCumulativeCollected = latestSale && latestSale.length > 0 ? latestSale[0].cumulative_collected : 0;
      const cumulativeCollected = previousCumulativeCollected + amountCollected;
      const previousJackpotTotal = latestSale && latestSale.length > 0 ? latestSale[0].ending_jackpot_total : game.carryover_jackpot;
      
      // Check if this is a Monday (day of drawing)
      const entryDate = new Date(rowForm.date);
      const isMonday = entryDate.getDay() === 1; // 0 = Sunday, 1 = Monday
      
      // Monday's ticket sales go to next week's jackpot
      const endingJackpotTotal = isMonday ? 
        previousJackpotTotal : // Monday sales don't add to current jackpot
        previousJackpotTotal + jackpotTotal;

      // Insert the new ticket sale
      const {
        data,
        error
      } = await supabase.from('ticket_sales').insert([{
        game_id: currentGameId,
        week_id: currentWeekId,
        date: rowForm.date,
        tickets_sold: rowForm.ticketsSold,
        ticket_price: ticketPrice,
        amount_collected: amountCollected,
        cumulative_collected: cumulativeCollected,
        organization_total: organizationTotal,
        jackpot_total: jackpotTotal,
        ending_jackpot_total: endingJackpotTotal
      }]).select();
      
      if (error) throw error;

      // Update the game's total sales and organization net profit
      await supabase.from('games').update({
        total_sales: cumulativeCollected,
        organization_net_profit: game.organization_net_profit + organizationTotal
      }).eq('id', currentGameId);

      // Update the week's weekly sales and tickets sold
      await supabase.from('weeks').update({
        weekly_sales: week.weekly_sales + amountCollected,
        weekly_tickets_sold: week.weekly_tickets_sold + rowForm.ticketsSold
      }).eq('id', currentWeekId);
      
      toast({
        title: "Entry Added",
        description: `Daily entry for ${rowForm.date} has been added successfully.`
      });
      
      setRowFormOpen(false);
      setRowForm({
        date: new Date().toISOString().split('T')[0],
        ticketsSold: 0
      });

      // If this is the 7th day, show the winner form
      const weekEntries = week.ticket_sales?.length || 0;
      if (weekEntries >= 6) {
        // After adding the 7th entry (index 6)
        setWinnerFormOpen(true);
      }
    } catch (error: any) {
      console.error('Error adding row:', error);
      toast({
        title: "Error",
        description: `Failed to add row: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const toggleGame = (gameId: string) => {
    setExpandedGame(expandedGame === gameId ? null : gameId);
    setExpandedWeek(null);
  };

  const toggleWeek = (weekId: string) => {
    setExpandedWeek(expandedWeek === weekId ? null : weekId);
  };

  const openWeekForm = (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    // Find the last week number for this game
    const lastWeekNumber = game.weeks.length > 0 ? Math.max(...game.weeks.map((w: any) => w.week_number)) : 0;
    
    setWeekForm({
      weekNumber: lastWeekNumber + 1,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setDate(new Date().getDate() + 6)).toISOString().split('T')[0]
    });
    
    setCurrentGameId(gameId);
    setWeekFormOpen(true);
  };

  const openRowForm = (gameId: string, weekId: string) => {
    setRowForm({
      date: new Date().toISOString().split('T')[0],
      ticketsSold: 0
    });
    
    setCurrentGameId(gameId);
    setCurrentWeekId(weekId);
    setRowFormOpen(true);
  };

  const openDeleteConfirm = (id: string, type: "game" | "week" | "entry" | "expense") => {
    setDeleteItemId(id);
    setDeleteType(type);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      if (deleteType === 'game') {
        // First delete related entries in ticket_sales
        const {
          data: weeks
        } = await supabase.from('weeks').select('id').eq('game_id', deleteItemId);
        
        if (weeks && weeks.length > 0) {
          const weekIds = weeks.map(week => week.id);

          // Delete ticket sales for these weeks
          await supabase.from('ticket_sales').delete().in('week_id', weekIds);

          // Delete expenses for this game
          await supabase.from('expenses').delete().eq('game_id', deleteItemId);

          // Delete the weeks
          await supabase.from('weeks').delete().in('id', weekIds);
        }

        // Finally delete the game
        await supabase.from('games').delete().eq('id', deleteItemId);
        
        toast({
          title: "Game Deleted",
          description: "Game and all associated data have been deleted."
        });
      } else if (deleteType === 'week') {
        // First delete related entries in ticket_sales
        await supabase.from('ticket_sales').delete().eq('week_id', deleteItemId);

        // Then delete the week
        await supabase.from('weeks').delete().eq('id', deleteItemId);
        
        toast({
          title: "Week Deleted",
          description: "Week and all associated entries have been deleted."
        });
      } else if (deleteType === 'entry') {
        // Get the entry details before deletion
        const {
          data: entry
        } = await supabase.from('ticket_sales').select('*').eq('id', deleteItemId).single();
        
        if (entry) {
          const {
            game_id,
            week_id,
            amount_collected,
            tickets_sold
          } = entry;

          // Get the week and game
          const {
            data: week
          } = await supabase.from('weeks').select('*').eq('id', week_id).single();
          
          const {
            data: game
          } = await supabase.from('games').select('*').eq('id', game_id).single();

          // Delete the entry
          await supabase.from('ticket_sales').delete().eq('id', deleteItemId);
          
          if (week && game) {
            // Update the week
            await supabase.from('weeks').update({
              weekly_sales: week.weekly_sales - amount_collected,
              weekly_tickets_sold: week.weekly_tickets_sold - tickets_sold
            }).eq('id', week_id);

            // Update the game
            const organizationTotal = amount_collected * (game.organization_percentage / 100);
            await supabase.from('games').update({
              total_sales: game.total_sales - amount_collected,
              organization_net_profit: game.organization_net_profit - organizationTotal
            }).eq('id', game_id);
          }
          
          toast({
            title: "Entry Deleted",
            description: "Daily entry has been deleted and totals updated."
          });
        }
      } else if (deleteType === 'expense') {
        // Get the expense details before deletion
        const {
          data: expense
        } = await supabase.from('expenses').select('*').eq('id', deleteItemId).single();
        
        if (expense) {
          const {
            game_id,
            amount,
            is_donation
          } = expense;

          // Get the game
          const {
            data: game
          } = await supabase.from('games').select('*').eq('id', game_id).single();

          // Delete the expense
          await supabase.from('expenses').delete().eq('id', deleteItemId);
          
          if (game) {
            // Update the game totals
            const updatedValues = {
              total_expenses: is_donation ? game.total_expenses : game.total_expenses - amount,
              total_donations: is_donation ? game.total_donations - amount : game.total_donations,
              organization_net_profit: game.organization_net_profit + amount // Adding because we're removing an expense/donation
            };
            
            await supabase.from('games').update(updatedValues).eq('id', game_id);
          }
          
          toast({
            title: is_donation ? "Donation Deleted" : "Expense Deleted",
            description: `The ${is_donation ? "donation" : "expense"} has been deleted and totals updated.`
          });
        }
      }

      // Refresh data
      fetchGames();
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast({
        title: "Error",
        description: `Failed to delete: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
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
  
  if (loading) {
    return <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Queen of Hearts Games</h1>
        <Button onClick={() => setGameFormOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" /> Create Game
        </Button>
      </div>
      
      <div className="space-y-4" style={{ backgroundColor: '#C3FFFA' }}>
        {games.length === 0 ? (
          <Card>
            <CardContent className="p-6 flex justify-center items-center">
              <p className="text-muted-foreground">No games created yet. Click "Create Game" to get started.</p>
            </CardContent>
          </Card>
        ) : (
          games.map(game => (
            <Card key={game.id} className="overflow-hidden">
              <CardHeader 
                className={`flex flex-col items-start justify-between cursor-pointer ${expandedGame === game.id ? 'bg-accent/50' : ''}`} 
                onClick={() => toggleGame(game.id)}
              >
                <div className="w-full flex flex-row items-center justify-between">
                  <CardTitle className="text-xl">
                    {game.name}
                    {game.end_date && <span className="ml-2 text-sm text-green-600 font-normal">(Completed)</span>}
                  </CardTitle>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm hidden md:flex space-x-4">
                      <div>
                        <span className="text-muted-foreground">Start:</span> {format(new Date(game.start_date), 'MMM d, yyyy')}
                        {game.end_date && <span className="ml-2 text-muted-foreground">End:</span>} {game.end_date && format(new Date(game.end_date), 'MMM d, yyyy')}
                      </div>
                      <div><span className="text-muted-foreground">Total:</span> {formatCurrency(game.total_sales)}</div>
                      <div><span className="text-muted-foreground">Profit:</span> {formatCurrency(game.organization_net_profit)}</div>
                    </div>
                    
                    <Button 
                      onClick={e => {
                        e.stopPropagation();
                        openDeleteConfirm(game.id, 'game');
                      }} 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                    
                    <div className="flex items-center">
                      {expandedGame === game.id ? 
                        <ChevronUp className="h-6 w-6 text-muted-foreground" /> : 
                        <ChevronDown className="h-6 w-6 text-muted-foreground" />
                      }
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              {expandedGame === game.id && (
                <CardContent className="p-0 border-t">
                  <div className="p-4 border-t">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Weeks</h3>
                      <Button 
                        onClick={() => openWeekForm(game.id)} 
                        size="sm" 
                        variant="outline" 
                        className="text-sm"
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Week
                      </Button>
                    </div>
                    
                    {game.weeks.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No weeks added yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {game.weeks.map((week: any) => (
                          <Card key={week.id} className="overflow-hidden" style={{ backgroundColor: '#EDFFDF' }}>
                            <CardHeader 
                              className={`py-3 flex flex-col cursor-pointer ${expandedWeek === week.id ? 'bg-accent/30' : ''}`} 
                              onClick={() => toggleWeek(week.id)}
                            >
                              {/* Week title and dates */}
                              <div className="flex flex-row items-center justify-between">
                                <div className="font-semibold">
                                  Week {week.week_number} ({format(new Date(week.start_date), 'MMM d, yyyy')} - {format(new Date(week.end_date), 'MMM d, yyyy')})
                                </div>
                                <div className="flex items-center">
                                  <Button 
                                    onClick={e => {
                                      e.stopPropagation();
                                      openDeleteConfirm(week.id, 'week');
                                    }} 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  
                                  {expandedWeek === week.id ? (
                                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                              </div>

                              {/* First row of information - text-left to ensure left alignment */}
                              <div className="text-sm flex flex-wrap mt-2 space-x-4 text-left">
                                <div><span className="text-muted-foreground">Tickets Sold:</span> {week.weekly_tickets_sold}</div>
                                <div><span className="text-muted-foreground">Ticket Sales:</span> {formatCurrency(week.weekly_sales)}</div>
                                <div><span className="text-muted-foreground">Organization Net Profit:</span> {formatCurrency(week.weekly_sales * (game.organization_percentage / 100))}</div>
                                <div><span className="text-muted-foreground">Jackpot Total:</span> {formatCurrency(week.weekly_sales * (game.jackpot_percentage / 100))}</div>
                              </div>

                              {/* Second row with winner information if available - also text-left for alignment */}
                              <div className="text-sm flex flex-wrap mt-2 space-x-4 text-left">
                                {week.winner_name && (
                                  <>
                                    <div><span className="text-muted-foreground">Winner Name:</span> {week.winner_name}</div>
                                    <div><span className="text-muted-foreground">Slot Selected:</span> {week.slot_chosen}</div>
                                    <div><span className="text-muted-foreground">Card Selected:</span> {week.card_selected}</div>
                                    <div><span className="text-muted-foreground">Payout Amount:</span> {formatCurrency(week.weekly_payout)}</div>
                                    <div><span className="text-muted-foreground">Present:</span> {week.winner_present ? 'Yes' : 'No'}</div>
                                  </>
                                )}
                                {!week.winner_name && (
                                  <div className="text-muted-foreground">No winner information yet</div>
                                )}
                              </div>
                            </CardHeader>
                            
                            {expandedWeek === week.id && (
                              <CardContent className="p-0 border-t">
                                <div className="p-3 bg-muted/20 flex flex-wrap gap-2 text-sm">
                                  {week.winner_name && (
                                    <div className="w-full mt-2">
                                      <Button
                                        onClick={() => {
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
                                        }}
                                        size="sm"
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        Print Payout Slip
                                      </Button>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="p-3 border-t">
                                  <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-semibold">Daily Entries</h4>
                                    {week.ticket_sales.length < 7 && (
                                      <Button 
                                        onClick={() => openRowForm(game.id, week.id)} 
                                        size="sm" 
                                        className="text-sm bg-[#1F4E4A] text-[#EDFFDF] hover:bg-[#1F4E4A]/90 hover:text-[#EDFFDF]"
                                      >
                                        <Plus className="h-3 w-3 mr-1 text-[#EDFFDF]" /> Add Entry
                                      </Button>
                                    )}
                                  </div>
                                  
                                  {week.ticket_sales.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">No daily entries yet.</p>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Tickets</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Organization</TableHead>
                                            <TableHead>Jackpot</TableHead>
                                            <TableHead>Ending Jackpot</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {week.ticket_sales.map((entry: any) => (
                                            <TableRow key={entry.id}>
                                              <TableCell>{format(new Date(entry.date), 'MMM d, yyyy')}</TableCell>
                                              <TableCell>{entry.tickets_sold}</TableCell>
                                              <TableCell>{formatCurrency(entry.amount_collected)}</TableCell>
                                              <TableCell>{formatCurrency(entry.organization_total)}</TableCell>
                                              <TableCell>{formatCurrency(entry.jackpot_total)}</TableCell>
                                              <TableCell>{formatCurrency(entry.ending_jackpot_total)}</TableCell>
                                              <TableCell className="text-right">
                                                <Button 
                                                  onClick={() => openDeleteConfirm(entry.id, 'entry')} 
                                                  variant="ghost" 
                                                  size="icon" 
                                                  className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Expenses & Donations</h3>
                      <Button 
                        onClick={() => openExpenseModal(game.id, game.name)} 
                        size="sm" 
                        variant="outline" 
                        className="text-sm"
                      >
                        Add Expense/Donation
                      </Button>
                    </div>
                    
                    {game.expenses && game.expenses.length > 0 ? (
                      <div className="overflow-x-auto">
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
                            {game.expenses.map((expense: any) => (
                              <TableRow key={expense.id}>
                                <TableCell>{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                                <TableCell>{formatCurrency(expense.amount)}</TableCell>
                                <TableCell>{expense.is_donation ? 'Donation' : 'Expense'}</TableCell>
                                <TableCell>{expense.memo}</TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    onClick={() => openDeleteConfirm(expense.id, 'expense')} 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No expenses or donations recorded yet.</p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
      
      {/* Week Form Dialog */}
      <Dialog open={weekFormOpen} onOpenChange={setWeekFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Week</DialogTitle>
            <DialogDescription>
              Enter the details for the new week.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="weekNumber" className="text-sm font-medium">Week Number</label>
              <input 
                id="weekNumber" 
                type="number" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                value={weekForm.weekNumber} 
                onChange={e => setWeekForm({
                  ...weekForm,
                  weekNumber: parseInt(e.target.value)
                })} 
                min="1" 
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="weekStartDate" className="text-sm font-medium">Start Date</label>
              <div className="flex h-10 w-full rounded-md border border-input">
                <input 
                  id="weekStartDate" 
                  type="date" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                  value={weekForm.startDate} 
                  onChange={e => setWeekForm({
                    ...weekForm,
                    startDate: e.target.value
                  })} 
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="weekEndDate" className="text-sm font-medium">End Date</label>
              <div className="flex h-10 w-full rounded-md border border-input">
                <input 
                  id="weekEndDate" 
                  type="date" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                  value={weekForm.endDate} 
                  onChange={e => setWeekForm({
                    ...weekForm,
                    endDate: e.target.value
                  })} 
                />
              </div>
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
      
      {/* Row Form Dialog */}
      <Dialog open={rowFormOpen} onOpenChange={setRowFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Daily Entry</DialogTitle>
            <DialogDescription>
              Enter the details for the daily entry.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="date" className="text-sm font-medium">Date</label>
              <div className="flex h-10 w-full rounded-md border border-input">
                <input 
                  id="date" 
                  type="date" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                  value={rowForm.date} 
                  onChange={e => setRowForm({
                    ...rowForm,
                    date: e.target.value
                  })} 
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="ticketsSold" className="text-sm font-medium">Tickets Sold</label>
              <input 
                id="ticketsSold" 
                type="number" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                value={rowForm.ticketsSold} 
                onChange={e => setRowForm({
                  ...rowForm,
                  ticketsSold: parseInt(e.target.value)
                })} 
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setRowFormOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button onClick={addRow} type="submit" variant="default">
              Add Entry
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
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button onClick={() => setDeleteDialogOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button onClick={confirmDelete} type="submit" variant="destructive">
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Expense Modal */}
      <ExpenseModal 
        open={expenseModalOpen} 
        onOpenChange={setExpenseModalOpen} 
        gameId={currentGameId || ''} 
        gameName={currentGameName} 
      />
      
      {/* Payout Slip Modal */}
      <PayoutSlipModal 
        open={payoutSlipOpen} 
        onOpenChange={setPayoutSlipOpen} 
        winnerData={payoutSlipData} 
      />
      
      {/* Winner Form */}
      <WinnerForm 
        open={winnerFormOpen} 
        onOpenChange={setWinnerFormOpen}
        gameId={currentGameId}
        weekId={currentWeekId}
        onComplete={handleWinnerComplete}
        onOpenPayoutSlip={handleOpenPayoutSlip}
      />
      
      {/* Game Form */}
      <GameForm 
        open={gameFormOpen} 
        onOpenChange={setGameFormOpen}
        games={games}
        onComplete={handleGameComplete}
      />
    </div>
  );
}
