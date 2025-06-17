import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/use-toast';
import { ChevronDown, ChevronUp, Plus, Trash } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function Dashboard() {
  const [games, setGames] = useState<any[]>([]);
  const [weeks, setWeeks] = useState<Record<string, any[]>>({});
  const [ticketSales, setTicketSales] = useState<Record<string, any[]>>({});
  const [expenses, setExpenses] = useState<Record<string, any[]>>({});
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [expandedExpenses, setExpandedExpenses] = useState<string | null>(null);
  const [newGameName, setNewGameName] = useState('');
  const [newWeekName, setNewWeekName] = useState('');
  const [newGameDialogOpen, setNewGameDialogOpen] = useState(false);
  const [newWeekDialogOpen, setNewWeekDialogOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [newTicketSaleDialogOpen, setNewTicketSaleDialogOpen] = useState(false);
  const [newTicketSale, setNewTicketSale] = useState({
    weekId: '',
    quantity: '',
    price: '',
    notes: ''
  });
  const [newExpenseDialogOpen, setNewExpenseDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    gameId: '',
    amount: '',
    description: ''
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<string | null>(null);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching games:', error);
      return;
    }

    setGames(data || []);
  };

  const fetchWeeks = async (gameId: string) => {
    const { data, error } = await supabase
      .from('weeks')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching weeks:', error);
      return;
    }

    setWeeks(prev => ({ ...prev, [gameId]: data || [] }));

    // Fetch ticket sales for each week
    data?.forEach(week => {
      fetchTicketSales(week.id);
    });
  };

  const fetchTicketSales = async (weekId: string) => {
    const { data, error } = await supabase
      .from('ticket_sales')
      .select('*')
      .eq('week_id', weekId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ticket sales:', error);
      return;
    }

    setTicketSales(prev => ({ ...prev, [weekId]: data || [] }));
  };

  const fetchExpenses = async (gameId: string) => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching expenses:', error);
      return;
    }

    setExpenses(prev => ({ ...prev, [gameId]: data || [] }));
  };

  const toggleGameExpansion = (gameId: string) => {
    if (expandedGame === gameId) {
      setExpandedGame(null);
    } else {
      setExpandedGame(gameId);
      fetchWeeks(gameId);
    }
  };

  const toggleExpensesExpansion = (gameId: string) => {
    if (expandedExpenses === gameId) {
      setExpandedExpenses(null);
    } else {
      setExpandedExpenses(gameId);
      fetchExpenses(gameId);
    }
  };

  const handleCreateGame = async () => {
    if (!newGameName.trim()) {
      toast({
        title: "Error",
        description: "Game name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    // Get the highest game number to increment
    const { data: existingGames } = await supabase
      .from('games')
      .select('game_number')
      .order('game_number', { ascending: false })
      .limit(1);

    const nextGameNumber = existingGames && existingGames.length > 0 
      ? existingGames[0].game_number + 1 
      : 1;

    const { data, error } = await supabase
      .from('games')
      .insert([{ 
        name: newGameName,
        game_number: nextGameNumber,
        start_date: new Date().toISOString().split('T')[0]
      }])
      .select();

    if (error) {
      toast({
        title: "Error",
        description: `Failed to create game: ${error.message}`,
        variant: "destructive"
      });
      return;
    }

    setNewGameName('');
    setNewGameDialogOpen(false);
    fetchGames();
    toast({
      title: "Success",
      description: "Game created successfully"
    });
  };

  const handleCreateWeek = async () => {
    if (!newWeekName.trim() || !selectedGameId) {
      toast({
        title: "Error",
        description: "Week name cannot be empty and a game must be selected",
        variant: "destructive"
      });
      return;
    }

    // Get the highest week number for this game to increment
    const { data: existingWeeks } = await supabase
      .from('weeks')
      .select('week_number')
      .eq('game_id', selectedGameId)
      .order('week_number', { ascending: false })
      .limit(1);

    const nextWeekNumber = existingWeeks && existingWeeks.length > 0 
      ? existingWeeks[0].week_number + 1 
      : 1;

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('weeks')
      .insert([{ 
        game_id: selectedGameId,
        week_number: nextWeekNumber,
        start_date: startDate,
        end_date: endDate
      }])
      .select();

    if (error) {
      toast({
        title: "Error",
        description: `Failed to create week: ${error.message}`,
        variant: "destructive"
      });
      return;
    }

    setNewWeekName('');
    setNewWeekDialogOpen(false);
    fetchWeeks(selectedGameId);
    toast({
      title: "Success",
      description: "Week created successfully"
    });
  };

  const handleCreateTicketSale = async () => {
    if (!newTicketSale.weekId || !newTicketSale.quantity || !newTicketSale.price) {
      toast({
        title: "Error",
        description: "Week, quantity, and price are required",
        variant: "destructive"
      });
      return;
    }

    const quantity = parseInt(newTicketSale.quantity);
    const price = parseFloat(newTicketSale.price);
    const amountCollected = quantity * price;
    const currentDate = new Date().toISOString().split('T')[0];

    // Get the game_id from the week
    const { data: weekData } = await supabase
      .from('weeks')
      .select('game_id')
      .eq('id', newTicketSale.weekId)
      .single();

    if (!weekData) {
      toast({
        title: "Error",
        description: "Could not find week information",
        variant: "destructive"
      });
      return;
    }

    const { data, error } = await supabase
      .from('ticket_sales')
      .insert([{
        game_id: weekData.game_id,
        week_id: newTicketSale.weekId,
        date: currentDate,
        tickets_sold: quantity,
        ticket_price: price,
        amount_collected: amountCollected,
        cumulative_collected: amountCollected, // This should be calculated properly
        organization_total: amountCollected * 0.4, // Assuming 40% organization split
        jackpot_total: amountCollected * 0.6, // Assuming 60% jackpot split
        ending_jackpot_total: amountCollected * 0.6 // This should be calculated properly
      }])
      .select();

    if (error) {
      toast({
        title: "Error",
        description: `Failed to create ticket sale: ${error.message}`,
        variant: "destructive"
      });
      return;
    }

    setNewTicketSale({
      weekId: '',
      quantity: '',
      price: '',
      notes: ''
    });
    setNewTicketSaleDialogOpen(false);
    fetchTicketSales(newTicketSale.weekId);
    toast({
      title: "Success",
      description: "Ticket sale created successfully"
    });
  };

  const handleCreateExpense = async () => {
    if (!newExpense.gameId || !newExpense.amount || !newExpense.description) {
      toast({
        title: "Error",
        description: "Game, amount, and description are required",
        variant: "destructive"
      });
      return;
    }

    const currentDate = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        game_id: newExpense.gameId,
        date: currentDate,
        amount: parseFloat(newExpense.amount),
        memo: newExpense.description
      }])
      .select();

    if (error) {
      toast({
        title: "Error",
        description: `Failed to create expense: ${error.message}`,
        variant: "destructive"
      });
      return;
    }

    setNewExpense({
      gameId: '',
      amount: '',
      description: ''
    });
    setNewExpenseDialogOpen(false);
    fetchExpenses(newExpense.gameId);
    toast({
      title: "Success",
      description: "Expense created successfully"
    });
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
      console.log(`Starting deletion of ${deleteType} with ID: ${deleteItemId}`);

      if (deleteType === 'game') {
        // First, check if the game exists
        const { data: gameCheck, error: gameCheckError } = await supabase
          .from('games')
          .select('id, name')
          .eq('id', deleteItemId)
          .single();

        if (gameCheckError) {
          console.error('Game not found:', gameCheckError);
          throw new Error(`Game not found: ${gameCheckError.message}`);
        }

        console.log('Game found:', gameCheck);

        // Delete all ticket_sales for this game first
        console.log('Deleting ticket sales...');
        const { error: ticketSalesError } = await supabase
          .from('ticket_sales')
          .delete()
          .eq('game_id', deleteItemId);

        if (ticketSalesError) {
          console.error('Error deleting ticket sales:', ticketSalesError);
          throw new Error(`Failed to delete ticket sales: ${ticketSalesError.message}`);
        }
        console.log('Ticket sales deleted successfully');

        // Delete all weeks for this game
        console.log('Deleting weeks...');
        const { error: weeksError } = await supabase
          .from('weeks')
          .delete()
          .eq('game_id', deleteItemId);

        if (weeksError) {
          console.error('Error deleting weeks:', weeksError);
          throw new Error(`Failed to delete weeks: ${weeksError.message}`);
        }
        console.log('Weeks deleted successfully');

        // Delete all expenses for this game
        console.log('Deleting expenses...');
        const { error: expensesError } = await supabase
          .from('expenses')
          .delete()
          .eq('game_id', deleteItemId);

        if (expensesError) {
          console.error('Error deleting expenses:', expensesError);
          throw new Error(`Failed to delete expenses: ${expensesError.message}`);
        }
        console.log('Expenses deleted successfully');

        // Finally delete the game itself
        console.log('Deleting game...');
        const { error: gameError } = await supabase
          .from('games')
          .delete()
          .eq('id', deleteItemId);

        if (gameError) {
          console.error('Error deleting game:', gameError);
          throw new Error(`Failed to delete game: ${gameError.message}`);
        }
        console.log('Game deleted successfully');

        // Update local state immediately
        setGames(prevGames => {
          const updatedGames = prevGames.filter(game => game.id !== deleteItemId);
          console.log('Updated local games state, remaining games:', updatedGames.length);
          return updatedGames;
        });

        // Reset expanded states
        if (expandedGame === deleteItemId) {
          setExpandedGame(null);
        }
        if (expandedExpenses === deleteItemId) {
          setExpandedExpenses(null);
        }

        toast({
          title: "Game Deleted",
          description: `Game "${gameCheck.name}" and all associated data have been deleted successfully.`
        });

      } else if (deleteType === 'week') {
        // First delete all ticket sales for this week
        const { error: ticketSalesError } = await supabase
          .from('ticket_sales')
          .delete()
          .eq('week_id', deleteItemId);

        if (ticketSalesError) {
          throw new Error(`Failed to delete ticket sales: ${ticketSalesError.message}`);
        }

        // Then delete the week itself
        const { data: weekData, error: weekError } = await supabase
          .from('weeks')
          .delete()
          .eq('id', deleteItemId)
          .select('game_id, week_number')
          .single();

        if (weekError) {
          throw new Error(`Failed to delete week: ${weekError.message}`);
        }

        // Refresh the weeks for this game
        fetchWeeks(weekData.game_id);

        toast({
          title: "Week Deleted",
          description: `Week ${weekData.week_number} and all associated ticket sales have been deleted.`
        });
      } else if (deleteType === 'entry') {
        const { data: entryData, error: entryError } = await supabase
          .from('ticket_sales')
          .delete()
          .eq('id', deleteItemId)
          .select('week_id')
          .single();

        if (entryError) {
          throw new Error(`Failed to delete entry: ${entryError.message}`);
        }

        // Refresh the ticket sales for this week
        fetchTicketSales(entryData.week_id);

        toast({
          title: "Entry Deleted",
          description: "Ticket sale entry has been deleted."
        });
      } else if (deleteType === 'expense') {
        const { data: expenseData, error: expenseError } = await supabase
          .from('expenses')
          .delete()
          .eq('id', deleteItemId)
          .select('game_id')
          .single();

        if (expenseError) {
          throw new Error(`Failed to delete expense: ${expenseError.message}`);
        }

        // Refresh the expenses for this game
        fetchExpenses(expenseData.game_id);

        toast({
          title: "Expense Deleted",
          description: "Expense has been deleted."
        });
      }

      // Force a complete refresh of data after any deletion
      console.log('Forcing data refresh...');
      setTimeout(() => {
        fetchGames();
      }, 500);

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
      setDeleteType(null);
    }
  };

  const calculateGameStats = (gameId: string) => {
    let totalRevenue = 0;
    let totalExpenses = 0;

    // Calculate revenue from all weeks and their ticket sales
    const gameWeeks = weeks[gameId] || [];
    gameWeeks.forEach(week => {
      const weekTicketSales = ticketSales[week.id] || [];
      weekTicketSales.forEach(sale => {
        totalRevenue += sale.tickets_sold * sale.ticket_price;
      });
    });

    // Calculate expenses
    const gameExpenses = expenses[gameId] || [];
    gameExpenses.forEach(expense => {
      totalExpenses += expense.amount;
    });

    const profit = totalRevenue - totalExpenses;

    return {
      totalRevenue,
      totalExpenses,
      profit
    };
  };

  const calculateWeekStats = (weekId: string) => {
    let totalRevenue = 0;
    const weekTicketSales = ticketSales[weekId] || [];
    
    weekTicketSales.forEach(sale => {
      totalRevenue += sale.tickets_sold * sale.ticket_price;
    });

    return {
      totalRevenue,
      totalTickets: weekTicketSales.reduce((sum, sale) => sum + sale.tickets_sold, 0)
    };
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Game Dashboard</h1>
        <div className="space-x-2">
          <Button onClick={() => setNewGameDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Game
          </Button>
          <Button onClick={() => setNewWeekDialogOpen(true)} variant="outline">
            <Plus className="mr-2 h-4 w-4" /> New Week
          </Button>
          <Button onClick={() => setNewTicketSaleDialogOpen(true)} variant="outline">
            <Plus className="mr-2 h-4 w-4" /> New Ticket Sale
          </Button>
          <Button onClick={() => setNewExpenseDialogOpen(true)} variant="outline">
            <Plus className="mr-2 h-4 w-4" /> New Expense
          </Button>
        </div>
      </div>

      {games.length === 0 ? (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No games found. Create your first game to get started.</p>
          </CardContent>
        </Card>
      ) : (
        games.map(game => (
          <Card key={game.id} className="mb-4">
            <CardHeader className="cursor-pointer" onClick={() => toggleGameExpansion(game.id)}>
              <div className="flex justify-between items-center">
                <CardTitle>{game.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteType('game');
                      setDeleteItemId(game.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash className="h-4 w-4 text-red-500" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    {expandedGame === game.id ? <ChevronUp /> : <ChevronDown />}
                  </Button>
                </div>
              </div>
              {expandedGame === game.id && (
                <div className="mt-2 grid grid-cols-3 gap-4">
                  <div className="bg-green-100 dark:bg-green-900 p-2 rounded">
                    <p className="text-sm font-medium">Total Revenue</p>
                    <p className="text-lg font-bold">{formatCurrency(calculateGameStats(game.id).totalRevenue)}</p>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900 p-2 rounded">
                    <p className="text-sm font-medium">Total Expenses</p>
                    <p className="text-lg font-bold">{formatCurrency(calculateGameStats(game.id).totalExpenses)}</p>
                  </div>
                  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded">
                    <p className="text-sm font-medium">Profit</p>
                    <p className="text-lg font-bold">{formatCurrency(calculateGameStats(game.id).profit)}</p>
                  </div>
                </div>
              )}
            </CardHeader>
            
            {expandedGame === game.id && (
              <CardContent>
                <Tabs defaultValue="weeks">
                  <TabsList>
                    <TabsTrigger value="weeks">Weeks</TabsTrigger>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                  </TabsList>
                  <TabsContent value="weeks">
                    {weeks[game.id]?.length > 0 ? (
                      <div className="space-y-4">
                        {weeks[game.id].map(week => (
                          <Card key={week.id}>
                            <CardHeader>
                              <div className="flex justify-between items-center">
                                <CardTitle className="text-lg">Week {week.week_number}</CardTitle>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => {
                                    setDeleteType('week');
                                    setDeleteItemId(week.id);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <div className="bg-green-100 dark:bg-green-900 p-2 rounded">
                                  <p className="text-sm font-medium">Revenue</p>
                                  <p className="text-lg font-bold">{formatCurrency(calculateWeekStats(week.id).totalRevenue)}</p>
                                </div>
                                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded">
                                  <p className="text-sm font-medium">Tickets Sold</p>
                                  <p className="text-lg font-bold">{calculateWeekStats(week.id).totalTickets}</p>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <h4 className="font-medium mb-2">Ticket Sales</h4>
                              {ticketSales[week.id]?.length > 0 ? (
                                <div className="space-y-2">
                                  {ticketSales[week.id].map(sale => (
                                    <div key={sale.id} className="flex justify-between items-center p-2 bg-muted rounded">
                                      <div>
                                        <p className="font-medium">{sale.tickets_sold} tickets @ {formatCurrency(sale.ticket_price)}</p>
                                        <p className="text-sm text-muted-foreground">{sale.date}</p>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <p className="font-medium">{formatCurrency(sale.tickets_sold * sale.ticket_price)}</p>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={() => {
                                            setDeleteType('entry');
                                            setDeleteItemId(sale.id);
                                            setDeleteDialogOpen(true);
                                          }}
                                        >
                                          <Trash className="h-4 w-4 text-red-500" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-muted-foreground">No ticket sales recorded for this week.</p>
                              )}
                              <Button 
                                className="mt-4" 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setNewTicketSale(prev => ({ ...prev, weekId: week.id }));
                                  setNewTicketSaleDialogOpen(true);
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" /> Add Ticket Sale
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground">No weeks found for this game.</p>
                        <Button 
                          className="mt-2" 
                          variant="outline"
                          onClick={() => {
                            setSelectedGameId(game.id);
                            setNewWeekDialogOpen(true);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" /> Add Week
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="expenses">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Expenses</h3>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setNewExpense(prev => ({ ...prev, gameId: game.id }));
                            setNewExpenseDialogOpen(true);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" /> Add Expense
                        </Button>
                      </div>
                      
                      {expenses[game.id]?.length > 0 ? (
                        <div className="space-y-2">
                          {expenses[game.id].map(expense => (
                            <div key={expense.id} className="flex justify-between items-center p-2 bg-muted rounded">
                              <div>
                                <p className="font-medium">{expense.memo}</p>
                                <p className="text-sm text-muted-foreground">{expense.date}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <p className="font-medium text-red-500">{formatCurrency(expense.amount)}</p>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => {
                                    setDeleteType('expense');
                                    setDeleteItemId(expense.id);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No expenses recorded for this game.</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            )}
          </Card>
        ))
      )}

      {/* New Game Dialog */}
      <Dialog open={newGameDialogOpen} onOpenChange={setNewGameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Game</DialogTitle>
            <DialogDescription>
              Enter the details for your new game.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateGame}>Create Game</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Week Dialog */}
      <Dialog open={newWeekDialogOpen} onOpenChange={setNewWeekDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Week</DialogTitle>
            <DialogDescription>
              Enter the details for your new week.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="game" className="text-right">
                Game
              </Label>
              <select
                id="game"
                value={selectedGameId || ''}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a game</option>
                {games.map(game => (
                  <option key={game.id} value={game.id}>{game.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="weekName" className="text-right">
                Week Name
              </Label>
              <Input
                id="weekName"
                value={newWeekName}
                onChange={(e) => setNewWeekName(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Week 1, Finals, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateWeek}>Create Week</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Ticket Sale Dialog */}
      <Dialog open={newTicketSaleDialogOpen} onOpenChange={setNewTicketSaleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Ticket Sale</DialogTitle>
            <DialogDescription>
              Record a new ticket sale for a specific week.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="week" className="text-right">
                Week
              </Label>
              <select
                id="week"
                value={newTicketSale.weekId}
                onChange={(e) => setNewTicketSale(prev => ({ ...prev, weekId: e.target.value }))}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a week</option>
                {games.map(game => (
                  <optgroup key={game.id} label={game.name}>
                    {(weeks[game.id] || []).map(week => (
                      <option key={week.id} value={week.id}>Week {week.week_number}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                value={newTicketSale.quantity}
                onChange={(e) => setNewTicketSale(prev => ({ ...prev, quantity: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Price per Ticket
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={newTicketSale.price}
                onChange={(e) => setNewTicketSale(prev => ({ ...prev, price: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Input
                id="notes"
                value={newTicketSale.notes}
                onChange={(e) => setNewTicketSale(prev => ({ ...prev, notes: e.target.value }))}
                className="col-span-3"
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateTicketSale}>Add Sale</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Expense Dialog */}
      <Dialog open={newExpenseDialogOpen} onOpenChange={setNewExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Record a new expense for a game.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expenseGame" className="text-right">
                Game
              </Label>
              <select
                id="expenseGame"
                value={newExpense.gameId}
                onChange={(e) => setNewExpense(prev => ({ ...prev, gameId: e.target.value }))}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a game</option>
                {games.map(game => (
                  <option key={game.id} value={game.id}>{game.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={newExpense.amount}
                onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                value={newExpense.description}
                onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                className="col-span-3"
                placeholder="e.g., Venue Rental, Equipment, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateExpense}>Add Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === 'game' && "This will delete the game and all associated weeks, ticket sales, and expenses."}
              {deleteType === 'week' && "This will delete the week and all associated ticket sales."}
              {deleteType === 'entry' && "This will delete this ticket sale entry."}
              {deleteType === 'expense' && "This will delete this expense entry."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
