import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { Plus, Calendar, Users, DollarSign, Trophy, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { GameForm } from "@/components/GameForm";
import { TicketSalesRow } from "@/components/TicketSalesRow";
import { WinnerForm } from "@/components/WinnerForm";
import { PayoutSlipModal } from "@/components/PayoutSlipModal";
import { ExpenseModal } from "@/components/ExpenseModal";

const Dashboard = () => {
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [showGameForm, setShowGameForm] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedGameForExpense, setSelectedGameForExpense] = useState<string>('');
  const [selectedGameNameForExpense, setSelectedGameNameForExpense] = useState<string>('');
  const [showTicketSalesForm, setShowTicketSalesForm] = useState<string | null>(null);
  const [showWinnerForm, setShowWinnerForm] = useState<string | null>(null);
  const [showPayoutSlip, setShowPayoutSlip] = useState(false);
  const [payoutSlipData, setPayoutSlipData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("current");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch games
  const { data: games, isLoading } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('game_number', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch weeks for each game
  const { data: weeks } = useQuery({
    queryKey: ['weeks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weeks')
        .select('*')
        .order('week_number', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch ticket sales
  const { data: ticketSales } = useQuery({
    queryKey: ['ticket_sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_sales')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch expenses
  const { data: expenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Real-time subscriptions
  useEffect(() => {
    const gamesChannel = supabase
      .channel('games-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'games' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['games'] });
        }
      )
      .subscribe();

    const weeksChannel = supabase
      .channel('weeks-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'weeks' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['weeks'] });
        }
      )
      .subscribe();

    const ticketSalesChannel = supabase
      .channel('ticket-sales-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ticket_sales' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ticket_sales'] });
        }
      )
      .subscribe();

    const expensesChannel = supabase
      .channel('expenses-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['expenses'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gamesChannel);
      supabase.removeChannel(weeksChannel);
      supabase.removeChannel(ticketSalesChannel);
      supabase.removeChannel(expensesChannel);
    };
  }, [queryClient]);

  // Week deletion mutation
  const deleteWeekMutation = useMutation({
    mutationFn: async (weekId: string) => {
      const { error: ticketSalesError } = await supabase
        .from('ticket_sales')
        .delete()
        .eq('week_id', weekId);

      if (ticketSalesError) throw ticketSalesError;

      const { error: weekError } = await supabase
        .from('weeks')
        .delete()
        .eq('id', weekId);

      if (weekError) throw weekError;

      return weekId;
    },
    onSuccess: (deletedWeekId) => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      queryClient.invalidateQueries({ queryKey: ['weeks'] });
      queryClient.invalidateQueries({ queryKey: ['ticket_sales'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      
      setExpandedWeeks(prev => {
        const newSet = new Set(prev);
        newSet.delete(deletedWeekId);
        return newSet;
      });
      
      toast({
        title: "Success",
        description: "Week deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete week: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Create week mutation
  const createWeekMutation = useMutation({
    mutationFn: async ({ gameId, weekData }: { gameId: string; weekData: any }) => {
      const gameWeeks = weeks?.filter(w => w.game_id === gameId) || [];
      const nextWeekNumber = gameWeeks.length + 1;

      const { data, error } = await supabase
        .from('weeks')
        .insert({
          game_id: gameId,
          week_number: nextWeekNumber,
          start_date: weekData.startDate,
          end_date: weekData.endDate,
          weekly_sales: 0,
          weekly_tickets_sold: 0,
          weekly_payout: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeks'] });
      toast({
        title: "Success",
        description: "Week created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create week: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const toggleGameExpansion = (gameId: string) => {
    setExpandedGames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gameId)) {
        newSet.delete(gameId);
      } else {
        newSet.add(gameId);
      }
      return newSet;
    });
  };

  const toggleWeekExpansion = (weekId: string) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekId)) {
        newSet.delete(weekId);
      } else {
        newSet.add(weekId);
      }
      return newSet;
    });
  };

  const getWeeksForGame = (gameId: string) => {
    return weeks?.filter(week => week.game_id === gameId) || [];
  };

  const getTicketSalesForWeek = (weekId: string) => {
    return ticketSales?.filter(sale => sale.week_id === weekId) || [];
  };

  const getExpensesForGame = (gameId: string) => {
    return expenses?.filter(expense => expense.game_id === gameId) || [];
  };

  const handleCreateWeek = async (gameId: string, startDate: string, endDate: string) => {
    createWeekMutation.mutate({ gameId, weekData: { startDate, endDate } });
  };

  const handleDeleteWeek = (weekId: string) => {
    if (window.confirm('Are you sure you want to delete this week? This will also delete all ticket sales for this week.')) {
      deleteWeekMutation.mutate(weekId);
    }
  };

  const handleOpenExpenseModal = (gameId: string, gameName: string) => {
    setSelectedGameForExpense(gameId);
    setSelectedGameNameForExpense(gameName);
    setShowExpenseModal(true);
  };

  const handleOpenPayoutSlip = (winnerData: any) => {
    setPayoutSlipData(winnerData);
    setShowPayoutSlip(true);
  };

  const currentGames = games?.filter(game => !game.end_date) || [];
  const archivedGames = games?.filter(game => game.end_date) || [];

  const renderGames = (gamesToRender: any[]) => {
    return gamesToRender.map((game) => {
      const gameWeeks = getWeeksForGame(game.id);
      const gameExpenses = getExpensesForGame(game.id);
      const isExpanded = expandedGames.has(game.id);

      return (
        <Card key={game.id} className="border shadow-sm">
          <Collapsible open={isExpanded} onOpenChange={() => toggleGameExpansion(game.id)}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span>{game.name}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Start: {format(new Date(game.start_date), 'MMM dd, yyyy')}</span>
                    {game.end_date && <span>End: {format(new Date(game.end_date), 'MMM dd, yyyy')}</span>}
                    <span>Sales: {formatCurrency(game.total_sales)}</span>
                    <span>Net: {formatCurrency(game.organization_net_profit)}</span>
                  </div>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Weeks</h3>
                  <WeekFormModal 
                    gameId={game.id}
                    onCreateWeek={handleCreateWeek}
                  />
                </div>

                <div className="space-y-2">
                  {gameWeeks.map((week) => {
                    const weekTicketSales = getTicketSalesForWeek(week.id);
                    const isWeekExpanded = expandedWeeks.has(week.id);

                    return (
                      <Card key={week.id} className="border-l-4 border-l-blue-500">
                        <Collapsible open={isWeekExpanded} onOpenChange={() => toggleWeekExpansion(week.id)}>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-gray-50 py-3">
                              <CardTitle className="flex items-center justify-between text-base">
                                <div className="flex items-center space-x-2">
                                  {isWeekExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  <span>Week {week.week_number}</span>
                                  <span className="text-sm text-gray-600">
                                    {format(new Date(week.start_date), 'MMM dd')} - {format(new Date(week.end_date), 'MMM dd, yyyy')}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center space-x-3 text-xs text-gray-600">
                                    <span>Tickets: {week.weekly_tickets_sold}</span>
                                    <span>Sales: {formatCurrency(week.weekly_sales)}</span>
                                    <span>Payout: {formatCurrency(week.weekly_payout)}</span>
                                    {week.winner_name && <span>Winner: {week.winner_name}</span>}
                                    {week.card_selected && <span>Card: {week.card_selected}</span>}
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteWeek(week.id);
                                    }}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CardTitle>
                            </CardHeader>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <h4 className="font-medium">Ticket Sales</h4>
                                {weekTicketSales.length > 0 ? (
                                  <div className="space-y-1">
                                    {weekTicketSales.map((sale) => (
                                      <div key={sale.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <div className="flex items-center space-x-3">
                                          <span className="text-sm">{format(new Date(sale.date), 'MMM dd, yyyy')}</span>
                                          <span className="text-sm">Tickets: {sale.tickets_sold}</span>
                                          <span className="text-sm">Amount: {formatCurrency(sale.amount_collected)}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-gray-500 text-sm">No ticket sales recorded</p>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowTicketSalesForm(week.id)}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add Ticket Sales
                                </Button>
                              </div>

                              {week.winner_name && (
                                <div className="space-y-2">
                                  <h4 className="font-medium">Winner Information</h4>
                                  <div className="bg-green-50 p-3 rounded-md">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div><strong>Winner:</strong> {week.winner_name}</div>
                                      <div><strong>Slot:</strong> {week.slot_chosen}</div>
                                      <div><strong>Card:</strong> {week.card_selected}</div>
                                      <div><strong>Present:</strong> {week.winner_present ? 'Yes' : 'No'}</div>
                                      <div><strong>Payout:</strong> {formatCurrency(week.weekly_payout)}</div>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenPayoutSlip({
                                        winnerName: week.winner_name,
                                        slotChosen: week.slot_chosen,
                                        cardSelected: week.card_selected,
                                        payoutAmount: week.weekly_payout,
                                        date: new Date().toISOString(),
                                        gameNumber: game.game_number,
                                        gameName: game.name,
                                        weekNumber: week.week_number,
                                        weekId: week.id,
                                        weekStartDate: week.start_date,
                                        weekEndDate: week.end_date
                                      })}
                                      className="mt-2"
                                    >
                                      Print Payout Slip
                                    </Button>
                                  </div>
                                </div>
                              )}

                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowWinnerForm(week.id)}
                                  disabled={!!week.winner_name}
                                >
                                  {week.winner_name ? "Winner Recorded" : "Record Winner"}
                                </Button>
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Expenses & Donations</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenExpenseModal(game.id, game.name)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Expense
                    </Button>
                  </div>
                  {gameExpenses.length > 0 ? (
                    <div className="space-y-1">
                      {gameExpenses.map((expense) => (
                        <div key={expense.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm">{format(new Date(expense.date), 'MMM dd, yyyy')}</span>
                            <span className="text-sm">{expense.memo}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              expense.is_donation ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {expense.is_donation ? 'Donation' : 'Expense'}
                            </span>
                          </div>
                          <span className="font-medium">{formatCurrency(expense.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No expenses recorded</p>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      );
    });
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Queen of Hearts Manager</h1>
        <GameForm
          open={showGameForm}
          onOpenChange={setShowGameForm}
          games={games || []}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['games'] });
            setShowGameForm(false);
          }}
        />
        <Dialog open={showGameForm} onOpenChange={setShowGameForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Game
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current">Current Game ({currentGames.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived Games ({archivedGames.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="current" className="space-y-4 mt-6">
          {currentGames.length > 0 ? (
            renderGames(currentGames)
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No current games. Create your first game to get started.</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="archived" className="space-y-4 mt-6">
          {archivedGames.length > 0 ? (
            renderGames(archivedGames)
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No archived games yet.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <ExpenseModal
        open={showExpenseModal}
        onOpenChange={setShowExpenseModal}
        gameId={selectedGameForExpense}
        gameName={selectedGameNameForExpense}
      />

      <PayoutSlipModal
        open={showPayoutSlip}
        onOpenChange={setShowPayoutSlip}
        winnerData={payoutSlipData}
      />

      {showTicketSalesForm && (
        <Dialog open={!!showTicketSalesForm} onOpenChange={() => setShowTicketSalesForm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Ticket Sales</DialogTitle>
            </DialogHeader>
            <TicketSalesRowForm
              weekId={showTicketSalesForm}
              onSuccess={() => {
                setShowTicketSalesForm(null);
                queryClient.invalidateQueries({ queryKey: ['ticket_sales'] });
                queryClient.invalidateQueries({ queryKey: ['weeks'] });
              }}
              onCancel={() => setShowTicketSalesForm(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {showWinnerForm && (
        <WinnerForm
          open={!!showWinnerForm}
          onOpenChange={() => setShowWinnerForm(null)}
          gameId={games?.find(g => getWeeksForGame(g.id).some(w => w.id === showWinnerForm))?.id || ''}
          weekId={showWinnerForm}
          onComplete={() => {
            setShowWinnerForm(null);
            queryClient.invalidateQueries({ queryKey: ['weeks'] });
          }}
          onOpenPayoutSlip={handleOpenPayoutSlip}
        />
      )}
    </div>
  );
};

// Helper components
const WeekFormModal = ({ gameId, onCreateWeek }: { gameId: string; onCreateWeek: (gameId: string, startDate: string, endDate: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSubmit = () => {
    if (startDate && endDate) {
      onCreateWeek(gameId, startDate, endDate);
      setOpen(false);
      setStartDate('');
      setEndDate('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Week
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Week</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleSubmit}
            disabled={!startDate || !endDate}
          >
            Create Week
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TicketSalesRowForm = ({ weekId, onSuccess, onCancel }: { weekId: string; onSuccess: () => void; onCancel: () => void }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    ticketsSold: '',
    ticketPrice: 2
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const ticketsSold = parseInt(formData.ticketsSold);
      if (!ticketsSold || ticketsSold <= 0) {
        return;
      }

      const amountCollected = ticketsSold * formData.ticketPrice;

      // Get the game_id from the week
      const { data: weekData, error: weekError } = await supabase
        .from('weeks')
        .select('game_id')
        .eq('id', weekId)
        .single();

      if (weekError) throw weekError;

      const { error } = await supabase
        .from('ticket_sales')
        .insert({
          game_id: weekData.game_id,
          week_id: weekId,
          date: formData.date,
          tickets_sold: ticketsSold,
          ticket_price: formData.ticketPrice,
          amount_collected: amountCollected,
          cumulative_collected: amountCollected,
          organization_total: amountCollected * 0.4,
          jackpot_total: amountCollected * 0.6,
          ending_jackpot_total: amountCollected * 0.6
        });

      if (error) throw error;

      onSuccess();
    } catch (error) {
      console.error('Error adding ticket sales:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ticketsSold">Tickets Sold</Label>
        <Input
          id="ticketsSold"
          type="number"
          value={formData.ticketsSold}
          onChange={(e) => setFormData({ ...formData, ticketsSold: e.target.value })}
          placeholder="150"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ticketPrice">Ticket Price ($)</Label>
        <Input
          id="ticketPrice"
          type="number"
          min="0.01"
          step="0.01"
          value={formData.ticketPrice}
          onChange={(e) => setFormData({ ...formData, ticketPrice: parseFloat(e.target.value) || 0 })}
          required
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Adding..." : "Add Row"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default Dashboard;
